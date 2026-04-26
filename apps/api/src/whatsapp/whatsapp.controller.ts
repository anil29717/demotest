import {
  Body,
  Controller,
  Get,
  Headers,
  Logger,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { LeadStatus } from '@prisma/client';
import { createHash, createHmac, timingSafeEqual } from 'crypto';
import type { Request, Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsappIngestService } from './whatsapp-ingest.service';
import { WhatsappRoutingService } from './whatsapp-routing.service';
import { WhatsappWebhookMetricsService } from './whatsapp-webhook-metrics.service';

type Payload = Record<string, unknown>;

function verifyHubSignature256(
  secret: string,
  rawBody: Buffer,
  signatureHeader: string,
): boolean {
  const prefix = 'sha256=';
  if (!signatureHeader.startsWith(prefix)) return false;
  const receivedHex = signatureHeader.slice(prefix.length);
  const expectedHex = createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');
  const a = Buffer.from(receivedHex, 'hex');
  const b = Buffer.from(expectedHex, 'hex');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** Meta Cloud API: entry[].changes[].value.messages[].id */
function extractMetaMessageId(payload: Payload): string | null {
  const entryRaw = payload.entry;
  if (!Array.isArray(entryRaw) || entryRaw.length === 0) return null;
  const first: unknown = entryRaw[0];
  if (typeof first !== 'object' || first === null) return null;
  const changesRaw = (first as Record<string, unknown>).changes;
  if (!Array.isArray(changesRaw) || changesRaw.length === 0) return null;
  const ch0: unknown = changesRaw[0];
  if (typeof ch0 !== 'object' || ch0 === null) return null;
  const valueRaw = (ch0 as Record<string, unknown>).value;
  if (typeof valueRaw !== 'object' || valueRaw === null) return null;
  const messagesRaw = (valueRaw as Record<string, unknown>).messages;
  if (!Array.isArray(messagesRaw) || messagesRaw.length === 0) return null;
  const m0: unknown = messagesRaw[0];
  if (typeof m0 !== 'object' || m0 === null) return null;
  const id = (m0 as Record<string, unknown>).id;
  return typeof id === 'string' && id.length > 0 ? `meta:${id}` : null;
}

function extractDedupeKey(payload: Payload, rawBody: Buffer): string {
  const meta = extractMetaMessageId(payload);
  if (meta) return meta;
  const custom = payload.webhookDedupeId ?? payload.messageId;
  if (typeof custom === 'string' && custom.length > 0)
    return `custom:${custom}`;
  return `sha256:${createHash('sha256').update(rawBody).digest('hex')}`;
}

@Controller('webhooks/whatsapp')
export class WhatsappController {
  private readonly logger = new Logger(WhatsappController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsappIngest: WhatsappIngestService,
    private readonly metrics: WhatsappWebhookMetricsService,
    private readonly routing: WhatsappRoutingService,
  ) {}

  /** Meta / WhatsApp Cloud API subscription verification (GET) */
  @Get()
  verify(
    @Res() res: Response,
    @Query('hub.mode') mode?: string,
    @Query('hub.verify_token') verifyToken?: string,
    @Query('hub.challenge') challenge?: string,
  ) {
    const expected = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
    if (
      mode === 'subscribe' &&
      expected &&
      verifyToken === expected &&
      challenge
    ) {
      res.status(200).type('text/plain').send(challenge);
      return;
    }
    res.status(403).type('text/plain').send('Forbidden');
  }

  @Post()
  async ingest(
    @Headers('x-hub-signature-256') signature: string | undefined,
    @Req() req: Request & { rawBody?: Buffer },
    @Body() payload: Payload,
  ) {
    const t0 = Date.now();
    this.logger.log('WhatsApp webhook POST received');
    const rawBody =
      req.rawBody && req.rawBody.length > 0
        ? req.rawBody
        : Buffer.from(JSON.stringify(payload ?? {}), 'utf8');

    const secret = process.env.WHATSAPP_WEBHOOK_SECRET;
    if (secret) {
      if (!signature) {
        this.metrics.recordSignatureRejected();
        void this.metrics.maybeAlertFailure('missing_signature');
        throw new UnauthorizedException('Missing X-Hub-Signature-256');
      }
      if (!verifyHubSignature256(secret, rawBody, signature)) {
        this.metrics.recordSignatureRejected();
        void this.metrics.maybeAlertFailure('invalid_signature');
        throw new UnauthorizedException('Invalid webhook signature');
      }
    }

    const dedupeKey = extractDedupeKey(payload, rawBody);
    const existing = await this.prisma.whatsAppIngest.findUnique({
      where: { dedupeKey },
    });
    if (existing) {
      this.logger.log(`WhatsApp webhook dedupe hit key=${dedupeKey}`);
      this.metrics.recordReceived(Date.now() - t0, {
        duplicate: true,
        leadCreated: false,
      });
      return {
        id: existing.id,
        received: true,
        duplicate: true,
        leadId: existing.leadId,
        intent: existing.intent,
      };
    }

    const parsed = this.whatsappIngest.summarizeFirstMessage(payload);
    const orgId = await this.whatsappIngest.resolveOrganizationId(
      payload,
      parsed?.textSnippet ?? null,
    );

    let leadId: string | null = null;
    let mappedIntent = parsed?.mappedIntent ?? null;
    const messageType = parsed?.messageType ?? null;
    const fromWaId = parsed?.fromWaId ?? null;
    const messageText =
      parsed?.textSnippet?.trim() ||
      parsed?.buttonPayload ||
      parsed?.interactiveId ||
      null;

    // Legacy: explicit organizationId + leadName on JSON body (non-Meta tests)
    if (!leadId && typeof payload.organizationId === 'string') {
      const admin = await this.prisma.organizationMember.findFirst({
        where: { organizationId: payload.organizationId, role: 'ADMIN' },
      });
      const agent =
        !admin &&
        (await this.prisma.organizationMember.findFirst({
          where: {
            organizationId: payload.organizationId,
            role: 'AGENT',
          },
        }));
      const owner = admin ?? agent;
      const leadName =
        typeof payload.leadName === 'string' ? payload.leadName : 'WhatsApp lead';
      if (owner) {
        const lead = await this.prisma.lead.create({
          data: {
            organizationId: payload.organizationId,
            ownerId: owner.userId,
            leadName,
            source: 'whatsapp',
            status: LeadStatus.WARM,
            pipelineStage: 'LEAD',
          },
        });
        leadId = lead.id;
        mappedIntent = mappedIntent ?? 'legacy_json';
      }
    }

    if (typeof payload.intent === 'string' && !mappedIntent) {
      mappedIntent = payload.intent;
    }

    const row = await this.prisma.whatsAppIngest.create({
      data: {
        dedupeKey,
        rawPayload: payload as object,
        intent: mappedIntent,
        messageType,
        fromWaId,
        leadId,
        messageText,
      },
    });

    setImmediate(() => {
      void this.routing.afterIngestCreated(row.id, orgId).catch((err) => {
        this.logger.warn(
          `Deferred WhatsApp NLP/routing failed ingest=${row.id}: ${err instanceof Error ? err.message : String(err)}`,
        );
      });
    });

    this.metrics.recordReceived(Date.now() - t0, {
      duplicate: false,
      leadCreated: Boolean(leadId),
    });

    return {
      id: row.id,
      received: true,
      duplicate: false,
      leadId,
      intent: row.intent,
      messageType: row.messageType,
      fromWaId: row.fromWaId,
    };
  }
}
