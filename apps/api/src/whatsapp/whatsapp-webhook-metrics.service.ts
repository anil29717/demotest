import { Injectable, Logger } from '@nestjs/common';

/**
 * In-process webhook metrics (Phase 1). Replace with Prometheus/OTel in production scale-out.
 */
@Injectable()
export class WhatsappWebhookMetricsService {
  private readonly logger = new Logger(WhatsappWebhookMetricsService.name);
  private received = 0;
  private deduped = 0;
  private signatureRejected = 0;
  private leadsCreated = 0;
  private latenciesMs: number[] = [];
  private readonly maxSamples = 100;

  recordReceived(ms: number, opts: { duplicate: boolean; leadCreated: boolean }) {
    this.received++;
    if (opts.duplicate) this.deduped++;
    if (opts.leadCreated) this.leadsCreated++;
    this.latenciesMs.push(ms);
    if (this.latenciesMs.length > this.maxSamples) {
      this.latenciesMs.shift();
    }
  }

  recordSignatureRejected() {
    this.signatureRejected++;
  }

  snapshot() {
    const lat = this.latenciesMs;
    const avg =
      lat.length === 0
        ? 0
        : Math.round(lat.reduce((a, b) => a + b, 0) / lat.length);
    return {
      webhooksReceived: this.received,
      webhooksDeduped: this.deduped,
      signatureRejected: this.signatureRejected,
      leadsCreatedFromWa: this.leadsCreated,
      avgProcessLatencyMsLast100: avg,
    };
  }

  async maybeAlertFailure(reason: string) {
    const url = process.env.ALERT_WEBHOOK_URL?.trim();
    if (!url) return;
    try {
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'whatsapp_webhook',
          reason,
          at: new Date().toISOString(),
        }),
      });
    } catch (e) {
      this.logger.warn('ALERT_WEBHOOK_URL post failed', e);
    }
  }
}
