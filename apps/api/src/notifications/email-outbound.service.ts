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

  private isResendConfigured(): boolean {
    return Boolean(
      process.env.RESEND_API_KEY?.trim() && process.env.SMTP_FROM?.trim(),
    );
  }

  private isSendgridConfigured(): boolean {
    return Boolean(
      process.env.SENDGRID_API_KEY?.trim() && process.env.SMTP_FROM?.trim(),
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
    if (!this.isSmtpConfigured() && !this.isResendConfigured() && !this.isSendgridConfigured()) {
      this.logger.log(
        `[email stub] to=${to} subject=${subject.slice(0, 80)} bodyChars=${text.length}`,
      );
      return { sent: true, detail: 'logged_stub' };
    }
    if (this.isResendConfigured()) {
      try {
        const resp = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: process.env.SMTP_FROM,
            to: [to],
            subject,
            text,
          }),
        });
        if (!resp.ok) {
          this.logger.warn(`Resend send failed status=${resp.status}`);
          return { sent: false, detail: `resend_http_${resp.status}` };
        }
        return { sent: true, detail: 'resend_sent' };
      } catch (e) {
        this.logger.warn(
          `Resend send failed: ${e instanceof Error ? e.message : String(e)}`,
        );
        return { sent: false, detail: 'resend_exception' };
      }
    }
    if (this.isSendgridConfigured()) {
      try {
        const resp = await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            personalizations: [{ to: [{ email: to }] }],
            from: { email: process.env.SMTP_FROM },
            subject,
            content: [{ type: 'text/plain', value: text }],
          }),
        });
        if (!resp.ok) {
          this.logger.warn(`SendGrid send failed status=${resp.status}`);
          return { sent: false, detail: `sendgrid_http_${resp.status}` };
        }
        return { sent: true, detail: 'sendgrid_sent' };
      } catch (e) {
        this.logger.warn(
          `SendGrid send failed: ${e instanceof Error ? e.message : String(e)}`,
        );
        return { sent: false, detail: 'sendgrid_exception' };
      }
    }
    this.logger.warn(
      'SMTP env detected but SMTP transport not wired. Set RESEND_API_KEY or SENDGRID_API_KEY for production email delivery.',
    );
    this.logger.log(`[email stub smtp-only] to=${to} subject=${subject}`);
    return { sent: true, detail: 'smtp_env_without_transport_stub' };
  }
}
