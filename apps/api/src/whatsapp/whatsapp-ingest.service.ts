import { Injectable, Logger } from '@nestjs/common';
import { LeadStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type Payload = Record<string, unknown>;

export type ParsedInboundMessage = {
  messageType: string;
  fromWaId: string | null;
  mappedIntent: string;
  textSnippet: string | null;
  buttonPayload: string | null;
  interactiveId: string | null;
};

function asObj(v: unknown): Record<string, unknown> | null {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;
}

/** Walk Meta Cloud API `entry[].changes[].value.messages[]`. */
export function extractInboundMessages(payload: Payload): ParsedInboundMessage[] {
  const out: ParsedInboundMessage[] = [];
  const entryRaw = payload.entry;
  if (!Array.isArray(entryRaw)) return out;
  for (const ent of entryRaw) {
    const e = asObj(ent);
    if (!e) continue;
    const changesRaw = e.changes;
    if (!Array.isArray(changesRaw)) continue;
    for (const ch of changesRaw) {
      const c = asObj(ch);
      if (!c) continue;
      const value = asObj(c.value);
      if (!value) continue;
      const messagesRaw = value.messages;
      if (!Array.isArray(messagesRaw)) continue;
      for (const m of messagesRaw) {
        const msg = asObj(m);
        if (!msg) continue;
        const type = typeof msg.type === 'string' ? msg.type : 'unknown';
        const from =
          typeof msg.from === 'string' && msg.from.length > 0 ? msg.from : null;
        let mappedIntent = 'unknown';
        let textSnippet: string | null = null;
        let buttonPayload: string | null = null;
        let interactiveId: string | null = null;
        if (type === 'text') {
          const t = asObj(msg.text);
          const body = typeof t?.body === 'string' ? t.body : '';
          textSnippet = body.slice(0, 500);
          mappedIntent = 'inquiry_text';
        } else if (type === 'button') {
          const b = asObj(msg.button);
          buttonPayload =
            typeof b?.payload === 'string' ? b.payload : typeof b?.text === 'string' ? b.text : null;
          mappedIntent = 'button_reply';
        } else if (type === 'interactive') {
          const ir = asObj(msg.interactive);
          const listReply = asObj(ir?.list_reply);
          const btnReply = asObj(ir?.button_reply);
          interactiveId =
            (typeof listReply?.id === 'string' && listReply.id) ||
            (typeof btnReply?.id === 'string' && btnReply.id) ||
            null;
          mappedIntent = 'interactive_reply';
        } else if (type === 'image' || type === 'document' || type === 'audio' || type === 'video') {
          mappedIntent = `media_${type}`;
        } else if (type === 'system' || type === 'reaction') {
          mappedIntent = type;
        }
        out.push({
          messageType: type,
          fromWaId: from,
          mappedIntent,
          textSnippet,
          buttonPayload,
          interactiveId,
        });
      }
    }
  }
  return out;
}

/** First CUID-like token in text (org routing convention). */
function extractOrgHintFromText(text: string | null): string | null {
  if (!text) return null;
  const m = text.match(/\b(c[a-z0-9]{20,})\b/i);
  return m ? m[1]! : null;
}

@Injectable()
export class WhatsappIngestService {
  private readonly logger = new Logger(WhatsappIngestService.name);

  constructor(private readonly prisma: PrismaService) {}

  summarizeFirstMessage(payload: Payload): ParsedInboundMessage | null {
    const msgs = extractInboundMessages(payload);
    return msgs.length > 0 ? msgs[0]! : null;
  }

  /**
   * Resolve target organization: explicit payload, env default, or first line org id hint.
   */
  async resolveOrganizationId(
    payload: Payload,
    textSnippet: string | null,
  ): Promise<string | null> {
    const explicit =
      typeof payload.organizationId === 'string' ? payload.organizationId : null;
    if (explicit) return explicit;
    const envDefault = process.env.WHATSAPP_DEFAULT_ORGANIZATION_ID?.trim();
    if (envDefault) return envDefault;
    const hint = extractOrgHintFromText(textSnippet);
    if (hint) {
      const org = await this.prisma.organization.findUnique({
        where: { id: hint },
        select: { id: true },
      });
      return org?.id ?? null;
    }
    return null;
  }

  async createLeadForInbound(params: {
    organizationId: string;
    leadName: string;
    fromWaId: string | null;
    mappedIntent: string;
  }): Promise<string | null> {
    const admin = await this.prisma.organizationMember.findFirst({
      where: { organizationId: params.organizationId, role: 'ADMIN' },
    });
    const agent = !admin
      ? await this.prisma.organizationMember.findFirst({
          where: { organizationId: params.organizationId, role: 'AGENT' },
        })
      : null;
    const owner = admin ?? agent;
    if (!owner) {
      this.logger.warn(
        `No ADMIN/AGENT member for org ${params.organizationId}; skipping lead create`,
      );
      return null;
    }
    const name =
      params.leadName.length > 0
        ? params.leadName.slice(0, 120)
        : `WhatsApp ${params.mappedIntent}`;
    const lead = await this.prisma.lead.create({
      data: {
        organizationId: params.organizationId,
        ownerId: owner.userId,
        leadName: name,
        phoneEnc: params.fromWaId ? `wa:${params.fromWaId}` : null,
        source: 'whatsapp',
        status: LeadStatus.WARM,
        pipelineStage: 'LEAD',
      },
    });
    return lead.id;
  }
}
