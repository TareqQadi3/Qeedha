import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type UnifonicChannel = 'SMS' | 'WHATSAPP' | 'EMAIL';

export interface UnifonicSendResult {
  success: boolean;
  providerRef: string | null;
}

/**
 * Single adapter covering SMS, WhatsApp and Email, all through one Unifonic
 * account (Unifonic offers all three channels under the same API/credentials,
 * which is why UNIFONIC_API_URL / UNIFONIC_API_KEY already existed in
 * .env.example before any channel was wired up).
 *
 * Safety contract: this adapter never throws. When UNIFONIC_API_KEY is empty
 * (the .env.example default), it logs a warning and returns a non-success
 * result instead of attempting a network call — so local/sandbox/dev
 * environments without a real Unifonic account never crash.
 */
@Injectable()
export class UnifonicAdapter {
  private readonly logger = new Logger(UnifonicAdapter.name);

  private readonly apiUrl: string;
  private readonly apiKey: string;
  private readonly senderId: string;
  private readonly emailFrom: string;
  private readonly whatsappTemplate: string;

  constructor(private readonly config: ConfigService) {
    this.apiUrl = this.config.get<string>(
      'UNIFONIC_API_URL',
      'https://api.unifonic.com',
    );
    this.apiKey = this.config.get<string>('UNIFONIC_API_KEY', '');
    this.senderId = this.config.get<string>('UNIFONIC_SENDER_ID', '');
    this.emailFrom = this.config.get<string>('UNIFONIC_EMAIL_FROM', '');
    this.whatsappTemplate = this.config.get<string>(
      'UNIFONIC_WHATSAPP_TEMPLATE',
      '',
    );
  }

  async sendSms(to: string, body: string): Promise<UnifonicSendResult> {
    return this.dispatch('SMS', to, { Body: body, SenderID: this.senderId });
  }

  async sendWhatsApp(
    to: string,
    templateData: Record<string, string>,
  ): Promise<UnifonicSendResult> {
    // WhatsApp Business API only allows pre-approved message templates for
    // business-initiated conversations (e.g. an OTP code) — UNIFONIC_WHATSAPP_TEMPLATE
    // names the template registered with Unifonic/Meta for this use case.
    return this.dispatch('WHATSAPP', to, {
      TemplateName: this.whatsappTemplate,
      TemplateData: templateData,
      SenderID: this.senderId,
    });
  }

  async sendEmail(
    to: string,
    subject: string,
    body: string,
  ): Promise<UnifonicSendResult> {
    return this.dispatch('EMAIL', to, {
      Subject: subject,
      Body: body,
      From: this.emailFrom,
    });
  }

  private async dispatch(
    channel: UnifonicChannel,
    to: string,
    extra: Record<string, unknown>,
  ): Promise<UnifonicSendResult> {
    if (!this.apiKey) {
      this.logger.warn(
        `Unifonic is not configured (UNIFONIC_API_KEY empty) — skipping ${channel} send to ${this.mask(to)}`,
      );
      return { success: false, providerRef: null };
    }

    try {
      const response = await fetch(
        `${this.apiUrl}${this.endpointFor(channel)}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // Unifonic supports Bearer-token auth on its REST API; AppSid in
            // the body is kept alongside it for compatibility with the legacy
            // form-encoded endpoints some Unifonic accounts still use.
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({
            AppSid: this.apiKey,
            Recipient: to,
            ...extra,
          }),
        },
      );

      const data = (await response.json().catch(() => ({}))) as Record<
        string,
        unknown
      >;

      if (!response.ok) {
        this.logger.warn(
          `Unifonic ${channel} send failed with status ${response.status}`,
        );
        return { success: false, providerRef: null };
      }

      // Best-effort mapping of Unifonic's response shape (documented field is
      // `MessageID`; some endpoints nest it under `data.id`) — not yet
      // exercised against a live account, so this may need a one-line fix
      // once real responses are observed.
      const providerRef = this.extractProviderRef(data);

      return { success: true, providerRef };
    } catch (err) {
      this.logger.warn(
        `Unifonic ${channel} send threw: ${(err as Error).message}`,
      );
      return { success: false, providerRef: null };
    }
  }

  private extractProviderRef(data: Record<string, unknown>): string | null {
    if (typeof data.MessageID === 'string') return data.MessageID;
    if (typeof data.messageId === 'string') return data.messageId;
    const nested = data.data as Record<string, unknown> | undefined;
    if (nested && typeof nested.id === 'string') return nested.id;
    return null;
  }

  private endpointFor(channel: UnifonicChannel): string {
    switch (channel) {
      case 'SMS':
        return '/rest/SMS/messages';
      case 'WHATSAPP':
        return '/rest/WhatsApp/messages';
      case 'EMAIL':
        return '/rest/Email/messages';
    }
  }

  private mask(recipient: string): string {
    return recipient.length > 4
      ? `${recipient.slice(0, -4).replace(/./g, '*')}${recipient.slice(-4)}`
      : recipient;
  }
}
