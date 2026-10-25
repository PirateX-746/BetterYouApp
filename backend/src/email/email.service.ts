import { Injectable, Logger } from '@nestjs/common';
import { createTransport, type Transporter } from 'nodemailer';

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** Where the recipient's replies go (e.g. the practice's own inbox). */
  replyTo?: string;
  /**
   * Stable key for this logical email. Resend drops a repeat with the same
   * key for 24h, so a retry or a second server instance can't double-send.
   */
  idempotencyKey?: string;
}

type Provider = 'resend' | 'smtp' | 'log';

const RESEND_ENDPOINT = 'https://api.resend.com/emails';

/**
 * Outgoing email. The provider is chosen from the environment:
 *
 *   resend  RESEND_API_KEY set (production) — Resend's HTTP API
 *   smtp    SMTP_HOST set (local dev) — e.g. Mailpit on localhost:1025,
 *           which catches every message in a web inbox instead of sending
 *   log     neither set — nothing is sent; a line is logged instead
 *
 * EMAIL_PROVIDER forces one explicitly. Missing settings for the chosen
 * provider stop the server at startup rather than failing silently later.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly provider: Provider;
  private readonly from: string;
  private readonly smtp?: Transporter;

  constructor() {
    const env = process.env;
    this.provider = resolveProvider(env);
    this.from = env.EMAIL_FROM || 'BetterYou <no-reply@localhost>';

    if (this.provider === 'resend') {
      if (!env.RESEND_API_KEY) {
        throw new Error('EMAIL_PROVIDER=resend requires RESEND_API_KEY');
      }
      if (!env.EMAIL_FROM) {
        throw new Error(
          'EMAIL_FROM is required with Resend (an address on a verified domain)',
        );
      }
    }

    if (this.provider === 'smtp') {
      if (!env.SMTP_HOST) {
        throw new Error('EMAIL_PROVIDER=smtp requires SMTP_HOST');
      }
      const port = Number(env.SMTP_PORT || 1025);
      this.smtp = createTransport({
        host: env.SMTP_HOST,
        port,
        secure: port === 465,
        auth: env.SMTP_USER
          ? { user: env.SMTP_USER, pass: env.SMTP_PASS ?? '' }
          : undefined,
      });
    }

    if (this.provider === 'log' && env.NODE_ENV === 'production') {
      this.logger.warn(
        'No email provider configured — patient emails will NOT be sent. Set RESEND_API_KEY and EMAIL_FROM.',
      );
    } else {
      this.logger.log(`Email provider: ${this.provider}`);
    }
  }

  get enabled() {
    return this.provider !== 'log';
  }

  async send(message: EmailMessage): Promise<void> {
    switch (this.provider) {
      case 'resend':
        return this.sendWithResend(message);
      case 'smtp':
        await this.smtp!.sendMail({
          from: this.from,
          to: message.to,
          replyTo: message.replyTo,
          subject: message.subject,
          html: message.html,
          text: message.text,
        });
        return;
      default:
        // The address and body can identify a patient; log only the subject.
        this.logger.log(`[email not sent: no provider] ${message.subject}`);
    }
  }

  private async sendWithResend(message: EmailMessage) {
    const res = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
        ...(message.idempotencyKey && {
          'Idempotency-Key': message.idempotencyKey,
        }),
      },
      body: JSON.stringify({
        from: this.from,
        to: [message.to],
        reply_to: message.replyTo,
        subject: message.subject,
        html: message.html,
        text: message.text,
      }),
    });
    if (!res.ok) {
      // Resend's error body names the problem (unverified domain, bad key…)
      // and never echoes the recipient or content.
      throw new Error(`Resend ${res.status}: ${await res.text()}`);
    }
  }
}

function resolveProvider(env: NodeJS.ProcessEnv): Provider {
  const forced = env.EMAIL_PROVIDER?.toLowerCase();
  if (forced === 'resend' || forced === 'smtp' || forced === 'log') {
    return forced;
  }
  if (forced) throw new Error(`Unknown EMAIL_PROVIDER "${forced}"`);
  if (env.RESEND_API_KEY) return 'resend';
  if (env.SMTP_HOST) return 'smtp';
  return 'log';
}
