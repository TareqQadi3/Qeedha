import { Injectable } from '@nestjs/common';

export type NotificationChannel = 'SMS' | 'PUSH' | 'EMAIL';

export interface NotificationPayload {
  recipientType: string;
  recipientId: string;
  channel: NotificationChannel;
  template: string;
  payload: Record<string, unknown>;
}

@Injectable()
export class NotificationsService {
  async send(_payload: NotificationPayload): Promise<void> {
    // Stub: will integrate Unifonic / FCM in later phase.
    // eslint-disable-next-line no-console
    console.log('[Notification Stub]', _payload);
  }
}
