import { Body, Controller, Headers, Post, UnauthorizedException } from '@nestjs/common';
import { LeadStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Controller('webhooks/whatsapp')
export class WhatsappController {
  constructor(private readonly prisma: PrismaService) {}

  @Post()
  async ingest(
    @Headers('x-hub-signature-256') signature: string | undefined,
    @Body() payload: Record<string, unknown>,
  ) {
    const secret = process.env.WHATSAPP_WEBHOOK_SECRET;
    if (secret) {
      if (!signature) throw new UnauthorizedException('Missing X-Hub-Signature-256');
      // Production: verify HMAC-SHA256(secret, rawBody) === signature
    }
    const row = await this.prisma.whatsAppIngest.create({
      data: {
        rawPayload: payload as object,
        intent: typeof payload.intent === 'string' ? payload.intent : null,
      },
    });

    let leadId: string | null = null;
    const orgId = typeof payload.organizationId === 'string' ? payload.organizationId : null;
    const leadName =
      typeof payload.leadName === 'string' ? payload.leadName : 'WhatsApp lead';

    if (orgId) {
      const admin = await this.prisma.organizationMember.findFirst({
        where: { organizationId: orgId, role: 'ADMIN' },
      });
      if (admin) {
        const lead = await this.prisma.lead.create({
          data: {
            organizationId: orgId,
            ownerId: admin.userId,
            leadName,
            source: 'whatsapp',
            status: LeadStatus.WARM,
            pipelineStage: 'LEAD',
          },
        });
        leadId = lead.id;
        await this.prisma.whatsAppIngest.update({
          where: { id: row.id },
          data: { leadId },
        });
      }
    }

    return { id: row.id, received: true, leadId };
  }
}
