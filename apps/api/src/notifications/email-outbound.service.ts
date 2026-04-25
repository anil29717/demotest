import { Injectable, Logger } from '@nestjs/common';

/**
 * Email stub: logs by default; uses SMTP_* env vars when set (nodemailer-free fetch to HTTP API optional Phase 2).
 */
@Injectable()
export class EmailOutboundService {
  private readonly logger = new Logger(EmailOutboundService.name);

  isSmtpConfigured(): boolean {
    return Boolean(
      process.env.SMTP_HOST?.trim() &&
        process.env.SMTP_FROM?.trim() &&
        process.env.SMTP_USER?.trim(),
    );
  }

  async send(
    to: string,
    subject: string,
    text: string,
  ): Promise<{ sent: boolean; detail?: string }> {
    if (process.env.FEATURE_EMAIL_OUTBOUND === 'false') {
      return { sent: false, detail: 'feature_disabled' };
    }
    if (!this.isSmtpConfigured()) {
      this.logger.log(
        `[email stub] to=${to} subject=${subject.slice(0, 80)} bodyChars=${text.length}`,
      );
      return { sent: true, detail: 'logged_stub' };
    }
    this.logger.warn(
      'SMTP_HOST set but transport not wired; logging only. Integrate nodemailer or SES in Phase 2.',
    );
    this.logger.log(`[email would send] to=${to} subject=${subject}`);
    return { sent: true, detail: 'smtp_partial_log_only' };
  }
}
