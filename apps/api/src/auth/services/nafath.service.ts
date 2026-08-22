import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type NafathStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';

export interface NafathInitResult {
  transactionId: string;
  status: NafathStatus;
}

export interface NafathStatusResult {
  status: NafathStatus;
  verifiedAt?: Date;
}

/**
 * Nafath (Saudi Digital Government Authority national SSO/eKYC) integration.
 *
 * Deliberately dormant for this phase per product decision: Nafath is left
 * for after launch and financing-partner sign-off. Until then NAFATH_ENABLED
 * defaults to false and this service behaves exactly as the original
 * in-memory stub always has — zero behavior change for any existing caller.
 *
 * When NAFATH_ENABLED=true, initiate()/getStatus() call the real Nafath
 * endpoints. Field names (`transId`, `random`, `status`) follow the shape
 * publicly documented for Nafath's national SSO flow as best-effort — they
 * are pending confirmation against the real integration guide once
 * government approval + credentials are in hand, so treat them as a
 * one-line-fix placeholder rather than a verified contract. Only a single
 * HTTP call per method is made; no retry/polling loop is built here.
 */
@Injectable()
export class NafathService {
  private readonly logger = new Logger(NafathService.name);
  private readonly store = new Map<string, NafathStatus>();
  // Tracks the random verification number Nafath returns from initiate(),
  // needed alongside transId on the real status-check endpoint.
  private readonly randomByTransaction = new Map<string, string>();

  private readonly enabled: boolean;
  private readonly apiUrl: string;
  private readonly apiKey: string;
  private readonly appId: string;

  constructor(private readonly config: ConfigService) {
    this.enabled =
      this.config.get<string>('NAFATH_ENABLED', 'false') === 'true';
    this.apiUrl = this.config.get<string>('NAFATH_API_URL', '');
    this.apiKey = this.config.get<string>('NAFATH_API_KEY', '');
    this.appId = this.config.get<string>('NAFATH_APP_ID', '');
  }

  async initiate(
    customerId: string,
    nationalId: string,
  ): Promise<NafathInitResult> {
    if (!this.enabled) {
      const transactionId = `nafath-${customerId}-${nationalId}`;
      this.store.set(transactionId, 'PENDING');
      return { transactionId, status: 'PENDING' };
    }

    try {
      const response = await fetch(`${this.apiUrl}/nafath/v1/requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': this.apiKey,
          'APP-ID': this.appId,
        },
        body: JSON.stringify({
          nationalId,
          service: 'GOVERNMENT_SERVICE_DEFAULT',
        }),
      });

      const data = (await response.json().catch(() => ({}))) as {
        transId?: string;
        random?: string;
      };

      if (!response.ok || !data.transId) {
        this.logger.error(
          `Nafath initiate failed with status ${response.status}`,
        );
        throw new Error(
          `Nafath initiate failed with status ${response.status}`,
        );
      }

      if (data.random) {
        this.randomByTransaction.set(data.transId, data.random);
      }

      return { transactionId: data.transId, status: 'PENDING' };
    } catch (err) {
      this.logger.error(`Nafath initiate threw: ${(err as Error).message}`);
      throw err;
    }
  }

  async getStatus(transactionId: string): Promise<NafathStatusResult> {
    if (!this.enabled) {
      const status = this.store.get(transactionId) ?? 'PENDING';
      return {
        status,
        verifiedAt: status === 'VERIFIED' ? new Date() : undefined,
      };
    }

    const random = this.randomByTransaction.get(transactionId) ?? '';

    try {
      const response = await fetch(`${this.apiUrl}/nafath/v1/requests/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': this.apiKey,
          'APP-ID': this.appId,
        },
        body: JSON.stringify({ transId: transactionId, random }),
      });

      const data = (await response.json().catch(() => ({}))) as {
        status?: NafathStatus;
      };

      if (!response.ok || !data.status) {
        this.logger.error(
          `Nafath getStatus failed with status ${response.status}`,
        );
        throw new Error(
          `Nafath getStatus failed with status ${response.status}`,
        );
      }

      return {
        status: data.status,
        verifiedAt: data.status === 'VERIFIED' ? new Date() : undefined,
      };
    } catch (err) {
      this.logger.error(`Nafath getStatus threw: ${(err as Error).message}`);
      throw err;
    }
  }

  verify(transactionId: string): Promise<void> {
    if (!this.enabled) {
      this.store.set(transactionId, 'VERIFIED');
      return Promise.resolve();
    }

    // Real Nafath verification happens on the citizen's own device inside the
    // Nafath app — there is no government endpoint to force it from our side.
    // This manual override only exists for the dev/test stub; when the real
    // integration is active it is a no-op and callers should poll getStatus().
    this.logger.warn(
      `NafathService.verify() called with NAFATH_ENABLED=true — this is a no-op in the real integration; poll getStatus() instead`,
    );
    return Promise.resolve();
  }
}
