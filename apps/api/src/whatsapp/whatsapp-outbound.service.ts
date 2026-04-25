import { Injectable, Logger } from '@nestjs/common';

/**
 * Meta WhatsApp Cloud API outbound (Module 1 / Module 7).
 * Requires WHATSAPP_CLOUD_API_TOKEN + WHATSAPP_PHONE_NUMBER_ID when sending.
 */
@Injectable()
export class WhatsappOutboundService {
  private readonly logger = new Logger(WhatsappOutboundService.name);

  isConfigured(): boolean {
    return Boolean(
      process.env.WHATSAPP_CLOUD_API_TOKEN?.trim() &&
        process.env.WHATSAPP_PHONE_NUMBER_ID?.trim(),
    );
  }

  /**
   * Send a plain text session message. Returns { sent } without throwing if not configured.
   */
  async sendTextMessage(toE164: string, body: string): Promise<{ sent: boolean; detail?: string }> {
    if (process.env.FEATURE_WHATSAPP_OUTBOUND === 'false') {
      this.logger.debug('WhatsApp outbound disabled (FEATURE_WHATSAPP_OUTBOUND=false)');
      return { sent: false, detail: 'feature_disabled' };
    }
    const token = process.env.WHATSAPP_CLOUD_API_TOKEN?.trim();
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
    if (!token || !phoneNumberId) {
      this.logger.debug('WhatsApp outbound skipped (missing WHATSAPP_CLOUD_API_TOKEN or WHATSAPP_PHONE_NUMBER_ID)');
      return { sent: false, detail: 'not_configured' };
    }
    const url = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: toE164.replace(/\s/g, ''),
          type: 'text',
          text: { preview_url: false, body },
        }),
      });
      if (!res.ok) {
        const t = await res.text();
        this.logger.warn(`WhatsApp send failed HTTP ${res.status}: ${t}`);
        return { sent: false, detail: t.slice(0, 200) };
      }
      return { sent: true };
    } catch (e) {
      this.logger.warn('WhatsApp send error', e);
      return { sent: false, detail: 'network_error' };
    }
  }
}
