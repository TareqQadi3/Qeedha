import { Injectable, Logger } from '@nestjs/common';
import { createHmac } from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { EncryptionService } from '../../common/services/encryption.service';
import { safeWebhookPost } from '../utils/ssrf-guard';

/**
 * Best-effort webhook delivery. A failure here must never surface as a
 * failure of the charge/refund request that triggered it — every public
 * method swallows its own errors and always records a WebhookDelivery row.
 *
 * Known limitation: no retry queue in this phase. A FAILED delivery is
 * recorded but not automatically retried.
 */
@Injectable()
export class WebhookDispatchService {
  private readonly logger = new Logger(WebhookDispatchService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  async dispatch(
    merchantId: string,
    event: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    try {
      const endpoints = await this.prisma.webhookEndpoint.findMany({
        where: { merchantId, isActive: true },
      });

      for (const endpoint of endpoints) {
        await this.deliverToEndpoint(
          endpoint.id,
          endpoint.url,
          endpoint.secretEncrypted,
          event,
          payload,
        );
      }
    } catch (err) {
      this.logger.error(
        `Webhook dispatch failed for merchant ${merchantId}, event ${event}`,
        err as Error,
      );
    }
  }

  private async deliverToEndpoint(
    endpointId: string,
    url: string,
    secretEncrypted: string,
    event: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    const body = JSON.stringify(payload);
    let status: 'SENT' | 'FAILED' = 'FAILED';
    let responseStatus: number | null = null;

    try {
      const secret = this.encryption.decrypt(secretEncrypted);
      const signature = createHmac('sha256', secret).update(body).digest('hex');

      // Re-resolves and re-validates the host immediately before connecting
      // (defeats DNS rebinding) and pins the connection to that validated IP.
      const response = await safeWebhookPost(
        url,
        body,
        {
          'Content-Type': 'application/json',
          'X-Qeedha-Signature': `sha256=${signature}`,
        },
        5000,
      );

      responseStatus = response.status;
      status =
        response.status >= 200 && response.status < 300 ? 'SENT' : 'FAILED';
    } catch (err) {
      this.logger.error(
        `Webhook delivery failed for endpoint ${endpointId}`,
        err as Error,
      );
      status = 'FAILED';
    }

    try {
      await this.prisma.webhookDelivery.create({
        data: {
          endpointId,
          event,
          payload: payload as unknown as Prisma.InputJsonValue,
          status,
          responseStatus: responseStatus ?? undefined,
          attempts: 1,
        },
      });
    } catch (err) {
      this.logger.error(
        `Failed to persist WebhookDelivery for endpoint ${endpointId}`,
        err as Error,
      );
    }
  }
}
