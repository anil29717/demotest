import { Injectable, Logger } from '@nestjs/common';
import { DealType, LeadStatus, PropertyType, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { MatchingService } from '../matching/matching.service';
import { RequirementsService } from '../requirements/requirements.service';
import { WhatsappOutboundService } from './whatsapp-outbound.service';
import { NlpService } from './nlp.service';
import type { NlpIntentResult } from './nlp.types';

const SOURCE_WHATSAPP_AUTO = 'whatsapp_auto';

function mapPropertyType(raw: string | null): PropertyType {
  const u = (raw ?? '').toUpperCase();
  if (u === 'COMMERCIAL') return PropertyType.COMMERCIAL;
  if (u === 'PLOT') return PropertyType.PLOT;
  if (u === 'INSTITUTIONAL') return PropertyType.INSTITUTIONAL;
  return PropertyType.RESIDENTIAL;
}

@Injectable()
export class WhatsappRoutingService {
  private readonly logger = new Logger(WhatsappRoutingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly nlp: NlpService,
    private readonly requirements: RequirementsService,
    private readonly matching: MatchingService,
    private readonly auth: AuthService,
    private readonly outbound: WhatsappOutboundService,
  ) {}

  async afterIngestCreated(ingestId: string, orgId: string | null): Promise<void> {
    const row = await this.prisma.whatsAppIngest.findUnique({
      where: { id: ingestId },
    });
    if (!row) return;

    const text =
      (row.messageText ??
        (typeof row.rawPayload === 'object' && row.rawPayload !== null
          ? String((row.rawPayload as { body?: string }).body ?? '')
          : '')) ||
      '';

    let nlpResult: NlpIntentResult;
    try {
      nlpResult = await this.nlp.classifyMessage(text, row.fromWaId ?? '');
    } catch (e) {
      this.logger.warn(`NLP exception ingest=${ingestId}: ${e}`);
      nlpResult = {
        intent: 'UNKNOWN',
        confidence: 0,
        propertyType: null,
        city: null,
        locality: null,
        budgetMin: null,
        budgetMax: null,
        bedrooms: null,
        areaSqft: null,
        timeline: null,
        urgency: null,
      };
    }

    await this.prisma.whatsAppIngest.update({
      where: { id: ingestId },
      data: {
        nlpIntent: nlpResult.intent,
        nlpConfidence: nlpResult.confidence,
        nlpExtracted: nlpResult as object,
      },
    });

    this.logger.log(
      `NLP classified ingest=${ingestId} intent=${nlpResult.intent} confidence=${nlpResult.confidence}`,
    );

    if (!orgId || nlpResult.intent === 'UNKNOWN') {
      await this.prisma.whatsAppIngest.update({
        where: { id: ingestId },
        data: { routingStatus: 'SKIPPED', routedAt: new Date() },
      });
      return;
    }

    try {
      await this.routeIntent(nlpResult, row.fromWaId, orgId, text, ingestId);
    } catch (e) {
      this.logger.warn(`Routing failed ingest=${ingestId}: ${e}`);
      await this.prisma.whatsAppIngest.update({
        where: { id: ingestId },
        data: { routingStatus: 'FAILED', routedAt: new Date() },
      });
    }
  }

  private async resolveOwnerId(organizationId: string): Promise<string | null> {
    const admin = await this.prisma.organizationMember.findFirst({
      where: { organizationId, role: 'ADMIN' },
    });
    if (admin) return admin.userId;
    const agent = await this.prisma.organizationMember.findFirst({
      where: { organizationId, role: 'AGENT' },
    });
    return agent?.userId ?? null;
  }

  private async routeIntent(
    nlp: NlpIntentResult,
    fromWaId: string | null,
    orgId: string,
    originalText: string,
    ingestId: string,
  ) {
    const ownerId = await this.resolveOwnerId(orgId);
    if (!ownerId) {
      await this.prisma.whatsAppIngest.update({
        where: { id: ingestId },
        data: { routingStatus: 'SKIPPED', routedAt: new Date() },
      });
      return;
    }

    const userId = await this.auth.findUserIdByWaSender(fromWaId);

    if (nlp.intent === 'BUY_INTENT' || nlp.intent === 'RENT_INTENT') {
      if (!userId) {
        const lead = await this.prisma.lead.create({
          data: {
            organizationId: orgId,
            ownerId,
            leadName: fromWaId ? `WhatsApp ${fromWaId}` : 'WhatsApp buyer',
            phoneEnc: fromWaId ? `wa:${fromWaId}` : null,
            source: SOURCE_WHATSAPP_AUTO,
            status: LeadStatus.WARM,
            pipelineStage: 'LEAD',
            tag: 'WHATSAPP_NO_USER',
          },
        });
        await this.prisma.leadNote.create({
          data: {
            leadId: lead.id,
            userId: ownerId,
            body: `${originalText}\n\nNLP: ${JSON.stringify(nlp)}`,
          },
        });
        await this.prisma.whatsAppIngest.update({
          where: { id: ingestId },
          data: {
            routingStatus: 'ROUTED',
            routedAt: new Date(),
            createdLeadId: lead.id,
          },
        });
        return;
      }

      const req = await this.requirements.createFromWhatsAppNlp(
        userId,
        nlp,
        nlp.intent === 'RENT_INTENT' ? DealType.RENT : DealType.SALE,
      );

      const lead = await this.prisma.lead.create({
        data: {
          organizationId: orgId,
          ownerId,
          leadName: fromWaId ?? 'WhatsApp buyer',
          phoneEnc: fromWaId ? `wa:${fromWaId}` : null,
          source: SOURCE_WHATSAPP_AUTO,
          status: LeadStatus.WARM,
          pipelineStage: 'LEAD',
          requirementId: req.id,
          tag: 'WHATSAPP_BUYER',
        },
      });

      await this.prisma.notification.create({
        data: {
          userId: ownerId,
          channel: 'in_app',
          title: 'New WhatsApp lead',
          body: `Buyer looking for ${nlp.propertyType ?? 'property'} in ${nlp.city ?? '—'}`,
        },
      });

      await this.prisma.whatsAppIngest.update({
        where: { id: ingestId },
        data: {
          routingStatus: 'ROUTED',
          routedAt: new Date(),
          createdLeadId: lead.id,
          createdRequirementId: req.id,
        },
      });
      return;
    }

    if (nlp.intent === 'SELL_INTENT' || nlp.intent === 'RENT_OUT_INTENT') {
      const lead = await this.prisma.lead.create({
        data: {
          organizationId: orgId,
          ownerId,
          leadName: fromWaId ?? 'WhatsApp seller',
          phoneEnc: fromWaId ? `wa:${fromWaId}` : null,
          source: SOURCE_WHATSAPP_AUTO,
          status: LeadStatus.WARM,
          pipelineStage: 'LEAD',
          tag: 'SELLER_INQUIRY',
        },
      });
      await this.prisma.leadNote.create({
        data: {
          leadId: lead.id,
          userId: ownerId,
          body: `${originalText}\n\n${JSON.stringify(nlp)}`,
        },
      });
      await this.prisma.notification.create({
        data: {
          userId: ownerId,
          channel: 'in_app',
          title: 'New WhatsApp lead',
          body: `Seller inquiry (${nlp.propertyType ?? '—'} in ${nlp.city ?? '—'})`,
        },
      });
      await this.prisma.whatsAppIngest.update({
        where: { id: ingestId },
        data: {
          routingStatus: 'ROUTED',
          routedAt: new Date(),
          createdLeadId: lead.id,
        },
      });
      return;
    }

    if (nlp.intent === 'INSTITUTIONAL_INQUIRY') {
      const lead = await this.prisma.lead.create({
        data: {
          organizationId: orgId,
          ownerId,
          leadName: fromWaId ?? 'Institutional WhatsApp',
          phoneEnc: fromWaId ? `wa:${fromWaId}` : null,
          source: SOURCE_WHATSAPP_AUTO,
          status: LeadStatus.WARM,
          pipelineStage: 'LEAD',
          tag: 'INSTITUTIONAL',
        },
      });
      await this.prisma.leadNote.create({
        data: {
          leadId: lead.id,
          userId: ownerId,
          body: originalText,
        },
      });
      const admins = await this.prisma.user.findMany({
        where: { role: UserRole.ADMIN },
        select: { id: true },
        take: 20,
      });
      for (const a of admins) {
        await this.prisma.notification.create({
          data: {
            userId: a.id,
            channel: 'in_app',
            title: 'Institutional inquiry from WhatsApp',
            body: `Org ${orgId} — see lead ${lead.id}`,
          },
        });
      }
      await this.prisma.whatsAppIngest.update({
        where: { id: ingestId },
        data: {
          routingStatus: 'ROUTED',
          routedAt: new Date(),
          createdLeadId: lead.id,
        },
      });
      return;
    }

    if (nlp.intent === 'PRICE_INQUIRY') {
      const city = nlp.city?.trim();
      const type = mapPropertyType(nlp.propertyType);
      const props = await this.prisma.property.findMany({
        where: {
          status: 'active',
          ...(city
            ? { city: { contains: city, mode: 'insensitive' as const } }
            : {}),
          propertyType: type,
        },
        take: 3,
        orderBy: { createdAt: 'desc' },
        select: { id: true, title: true, city: true, price: true },
      });
      const lines = props.map(
        (p, i) =>
          `${i + 1}. ${p.title} — ${p.city} — ₹${Number(p.price).toLocaleString('en-IN')}`,
      );
      const body =
        lines.length > 0
          ? `Here are some listings:\n${lines.join('\n')}`
          : 'No matching listings found right now. A broker will follow up.';

      if (fromWaId && this.outbound.isConfigured()) {
        const d = fromWaId.replace(/\D/g, '');
        const toE164 = d.length === 10 ? `+91${d}` : d.startsWith('91') ? `+${d}` : `+${d}`;
        void this.outbound.sendTextMessage(toE164, body);
      }

      const lead = await this.prisma.lead.create({
        data: {
          organizationId: orgId,
          ownerId,
          leadName: 'WhatsApp price inquiry',
          phoneEnc: fromWaId ? `wa:${fromWaId}` : null,
          source: SOURCE_WHATSAPP_AUTO,
          status: LeadStatus.WARM,
          pipelineStage: 'LEAD',
          tag: 'PRICE_INQUIRY',
        },
      });
      await this.prisma.leadNote.create({
        data: {
          leadId: lead.id,
          userId: ownerId,
          body: `${originalText}\n\n${body}`,
        },
      });
      await this.prisma.whatsAppIngest.update({
        where: { id: ingestId },
        data: {
          routingStatus: 'ROUTED',
          routedAt: new Date(),
          createdLeadId: lead.id,
        },
      });
      return;
    }

    if (nlp.intent === 'STATUS_UPDATE' || nlp.intent === 'SUPPORT') {
      const lead = await this.prisma.lead.create({
        data: {
          organizationId: orgId,
          ownerId,
          leadName: `WhatsApp ${nlp.intent}`,
          phoneEnc: fromWaId ? `wa:${fromWaId}` : null,
          source: SOURCE_WHATSAPP_AUTO,
          status: LeadStatus.WARM,
          pipelineStage: 'LEAD',
          tag: 'HUMAN_FOLLOWUP',
        },
      });
      await this.prisma.leadNote.create({
        data: {
          leadId: lead.id,
          userId: ownerId,
          body: originalText,
        },
      });
      await this.prisma.whatsAppIngest.update({
        where: { id: ingestId },
        data: {
          routingStatus: 'ROUTED',
          routedAt: new Date(),
          createdLeadId: lead.id,
        },
      });
      return;
    }

    await this.prisma.whatsAppIngest.update({
      where: { id: ingestId },
      data: { routingStatus: 'SKIPPED', routedAt: new Date() },
    });
  }
}
