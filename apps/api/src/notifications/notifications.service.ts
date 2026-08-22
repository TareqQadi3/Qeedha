import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UnifonicAdapter } from './adapters/unifonic.adapter';

export type NotificationChannel = 'SMS' | 'PUSH' | 'EMAIL' | 'WHATSAPP';

export interface NotificationPayload {
  recipientType: string;
  recipientId: string;
  channel: NotificationChannel;
  template: string;
  payload: Record<string, unknown>;
}

/**
 * Dispatches notifications and records an audit trail row per attempt.
 *
 * Contract preserved from the original stub: `send()` never throws. A
 * dispatch failure (missing provider config, network error, non-2xx
 * response) is recorded as a FAILED Notification row and logged — it must
 * never break the caller's flow (transactions.service.ts calls this
 * without a try/catch).
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly unifonic: UnifonicAdapter,
  ) {}

  async send(payload: NotificationPayload): Promise<void> {
    let notificationId: string | undefined;

    try {
      const notification = await this.prisma.notification.create({
        data: {
          recipientType: payload.recipientType,
          recipientId: payload.recipientId,
          channel: payload.channel,
          template: payload.template,
          payload: payload.payload as Prisma.InputJsonValue,
          status: 'PENDING',
        },
      });
      notificationId = notification.id;
    } catch (err) {
      // If we cannot even persist the audit row, we still attempt delivery
      // (best-effort) but there is nothing further to update afterwards.
      this.logger.error(
        `Failed to persist notification row: ${(err as Error).message}`,
      );
    }

    let result: { success: boolean; providerRef: string | null };
    try {
      result = await this.dispatch(payload);
    } catch (err) {
      this.logger.error(
        `Notification dispatch threw unexpectedly: ${(err as Error).message}`,
      );
      result = { success: false, providerRef: null };
    }

    if (!notificationId) return;

    try {
      await this.prisma.notification.update({
        where: { id: notificationId },
        data: {
          status: result.success ? 'SENT' : 'FAILED',
          providerRef: result.providerRef,
          sentAt: result.success ? new Date() : null,
        },
      });
    } catch (err) {
      this.logger.error(
        `Failed to update notification row ${notificationId}: ${(err as Error).message}`,
      );
    }
  }

  private async dispatch(
    payload: NotificationPayload,
  ): Promise<{ success: boolean; providerRef: string | null }> {
    // `recipientId` identifies the entity this notification is *about* (a
    // customer/merchant id, or a raw phone before the customer row exists)
    // and is what gets persisted on the Notification row for audit purposes.
    // The actual delivery address for direct channels is the optional `to`
    // field in payload.payload — falling back to recipientId lets a raw
    // phone number still work as both.
    const to =
      (payload.payload.to as string | undefined) ?? payload.recipientId;

    switch (payload.channel) {
      case 'SMS':
        return this.unifonic.sendSms(to, this.renderText(payload));
      case 'WHATSAPP':
        return this.unifonic.sendWhatsApp(to, this.stringifyPayload(payload));
      case 'EMAIL':
        return this.unifonic.sendEmail(
          to,
          payload.template,
          this.renderText(payload),
        );
      case 'PUSH':
        // Push notifications are handled by the (separate, not-yet-built)
        // Firebase integration; nothing to dispatch through Unifonic.
        this.logger.warn(
          'PUSH channel has no active provider yet — recording as FAILED',
        );
        return { success: false, providerRef: null };
    }
  }

  private renderText(payload: NotificationPayload): string {
    return `${payload.template}: ${JSON.stringify(payload.payload)}`;
  }

  private stringifyPayload(
    payload: NotificationPayload,
  ): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(payload.payload)) {
      result[key] = String(value);
    }
    return result;
  }
}
