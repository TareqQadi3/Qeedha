import { Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { hashSync } from 'bcryptjs';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../common/services/audit.service';
import { EncryptionService } from '../../common/services/encryption.service';
import { IdempotencyService } from '../../common/services/idempotency.service';
import { DomainException } from '../../common/exceptions/domain.exception';
import { TransactionsService } from '../../transactions/transactions.service';
import { TransactionResponseDto } from '../../transactions/dto/transaction.dto';
import { WebhookDispatchService } from './webhook-dispatch.service';
import {
  assertPublicHostname,
  UnsafeWebhookUrlError,
} from '../utils/ssrf-guard';
import {
  CreateChargeDto,
  CreateRefundDto,
  IntegrationChargeResponse,
  RegisterCustomerMappingDto,
  RegisterWebhookDto,
} from '../dto/integration.dto';

interface MinimalTransaction {
  id: string;
  externalTransactionId: string | null;
  externalSystem?: string | null;
  status: string;
  amount: number | Prisma.Decimal;
  branchId?: string | null;
  invoiceReference?: string | null;
  createdAt: Date;
}

@Injectable()
export class IntegrationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly encryption: EncryptionService,
    private readonly idempotency: IdempotencyService,
    private readonly transactions: TransactionsService,
    private readonly webhooks: WebhookDispatchService,
  ) {}

  async registerCustomerMapping(
    merchantId: string,
    dto: RegisterCustomerMappingDto,
  ) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: dto.qeedhaCustomerId },
    });
    if (!customer) throw new DomainException('NOT_FOUND', 'Customer not found');

    // Ownership check: a merchant may only map customers it actually has a
    // relationship with (i.e. at least one wallet issued through this merchant).
    const wallet = await this.prisma.wallet.findFirst({
      where: { customerId: dto.qeedhaCustomerId, merchantId },
    });
    if (!wallet) {
      throw new DomainException(
        'FORBIDDEN',
        'Customer has no wallet with this merchant',
      );
    }

    const mapping = await this.prisma.externalCustomerMapping.upsert({
      where: {
        merchantId_externalSystem_externalCustomerId: {
          merchantId,
          externalSystem: dto.externalSystem,
          externalCustomerId: dto.externalCustomerId,
        },
      },
      create: {
        merchantId,
        customerId: dto.qeedhaCustomerId,
        externalSystem: dto.externalSystem,
        externalCustomerId: dto.externalCustomerId,
      },
      update: {
        customerId: dto.qeedhaCustomerId,
      },
    });

    await this.audit.log({
      actorType: 'integration',
      action: 'EXTERNAL_CUSTOMER_MAPPING_REGISTERED',
      entity: 'external_customer_mapping',
      entityId: mapping.id,
      after: {
        merchantId,
        externalSystem: mapping.externalSystem,
        externalCustomerId: mapping.externalCustomerId,
        qeedhaCustomerId: mapping.customerId,
      },
    });

    return {
      id: mapping.id,
      externalSystem: mapping.externalSystem,
      externalCustomerId: mapping.externalCustomerId,
      qeedhaCustomerId: mapping.customerId,
      createdAt: mapping.createdAt,
    };
  }

  async createCharge(
    merchantId: string,
    dto: CreateChargeDto,
    idempotencyKeyHeader: string,
  ): Promise<IntegrationChargeResponse> {
    if (dto.currency !== 'SAR') {
      // v1 limitation: single-currency (SAR) only. Multi-currency wallets are out of scope.
      throw new DomainException(
        'VALIDATION_ERROR',
        'Only SAR currency is supported in this API version',
      );
    }

    const requestHash = this.hashRequest(dto);
    if (idempotencyKeyHeader) {
      const existingIdem =
        await this.idempotency.getExisting<IntegrationChargeResponse>(
          idempotencyKeyHeader,
          'integration_charge',
        );
      if (existingIdem) {
        if (existingIdem.requestHash !== requestHash) {
          throw new DomainException(
            'CONFLICT',
            'Idempotency key conflict: request payload mismatch',
          );
        }
        if (existingIdem.response) {
          return existingIdem.response;
        }
      }
    }

    // Primary idempotency mechanism: the (externalSystem, externalTransactionId)
    // pair is unique on transactions, so a retried charge is simply returned as-is.
    const existingTx = await this.prisma.transaction.findUnique({
      where: {
        externalSystem_externalTransactionId: {
          externalSystem: dto.externalSystem,
          externalTransactionId: dto.externalTransactionId,
        },
      },
    });
    if (existingTx) {
      // The (externalSystem, externalTransactionId) pair is unique across
      // ALL merchants, so a cache hit here does not by itself prove the
      // caller owns it — re-verify tenant ownership before returning it,
      // exactly like getChargeStatus/refundCharge do below.
      const existingWallet = await this.prisma.wallet.findUnique({
        where: { id: existingTx.walletId },
      });
      if (!existingWallet || existingWallet.merchantId !== merchantId) {
        throw new DomainException(
          'FORBIDDEN',
          'Charge does not belong to this merchant',
        );
      }
      return this.toChargeResponse(existingTx);
    }

    const mapping = await this.prisma.externalCustomerMapping.findUnique({
      where: {
        merchantId_externalSystem_externalCustomerId: {
          merchantId,
          externalSystem: dto.externalSystem,
          externalCustomerId: dto.externalCustomerId,
        },
      },
    });
    if (!mapping) {
      throw new DomainException(
        'NOT_FOUND',
        'Customer mapping not found for this externalCustomerId',
      );
    }

    const wallet = await this.prisma.wallet.findFirst({
      where: { customerId: mapping.customerId, merchantId, status: 'ACTIVE' },
    });
    if (!wallet) {
      throw new DomainException(
        'NOT_FOUND',
        'No active wallet found for this customer with this merchant',
      );
    }

    if (dto.branchReference) {
      const branch = await this.prisma.branch.findUnique({
        where: { id: dto.branchReference },
      });
      if (!branch || branch.merchantId !== merchantId) {
        throw new DomainException(
          'FORBIDDEN',
          'branchReference does not belong to this merchant',
        );
      }
    }

    const transactionIdempotencyKey = `integration:${merchantId}:${dto.externalSystem}:${dto.externalTransactionId}`;

    let response: IntegrationChargeResponse;
    try {
      const tx = await this.transactions.payFromIntegration(
        {
          walletId: wallet.id,
          amount: dto.amount,
          branchId: dto.branchReference,
          externalTransactionId: dto.externalTransactionId,
          externalSystem: dto.externalSystem,
          invoiceReference: dto.invoiceReference,
          metadata: dto.metadata,
        },
        transactionIdempotencyKey,
      );
      response = this.toChargeResponse(tx);
      // Fire-and-forget: webhook delivery must never block the charge
      // response (it can take up to the delivery timeout to complete, and
      // dispatch() already swallows its own errors and never rejects).
      void this.webhooks.dispatch(
        merchantId,
        'charge.succeeded',
        response as unknown as Record<string, unknown>,
      );
    } catch (err) {
      void this.webhooks.dispatch(merchantId, 'charge.failed', {
        externalSystem: dto.externalSystem,
        externalTransactionId: dto.externalTransactionId,
        error: err instanceof Error ? err.message : 'unknown_error',
      });
      throw err;
    }

    if (idempotencyKeyHeader) {
      await this.idempotency.store(
        idempotencyKeyHeader,
        'integration_charge',
        response.qeedhaTransactionId,
        requestHash,
        response,
        86400,
      );
    }

    return response;
  }

  async refundCharge(
    merchantId: string,
    dto: CreateRefundDto,
    idempotencyKeyHeader: string,
  ): Promise<IntegrationChargeResponse> {
    const original = await this.prisma.transaction.findUnique({
      where: {
        externalSystem_externalTransactionId: {
          externalSystem: dto.externalSystem,
          externalTransactionId: dto.externalTransactionId,
        },
      },
    });
    if (!original) {
      throw new DomainException('NOT_FOUND', 'Original charge not found');
    }

    const wallet = await this.prisma.wallet.findUnique({
      where: { id: original.walletId },
    });
    if (!wallet || wallet.merchantId !== merchantId) {
      throw new DomainException(
        'FORBIDDEN',
        'Charge does not belong to this merchant',
      );
    }

    try {
      const refundTx = await this.transactions.refund(
        original.id,
        { reason: dto.reason ?? 'Integration refund', amount: dto.amount },
        idempotencyKeyHeader,
      );
      const response = this.toChargeResponse(
        refundTx,
        dto.externalTransactionId,
      );
      void this.webhooks.dispatch(
        merchantId,
        'refund.succeeded',
        response as unknown as Record<string, unknown>,
      );
      return response;
    } catch (err) {
      void this.webhooks.dispatch(merchantId, 'refund.failed', {
        externalSystem: dto.externalSystem,
        externalTransactionId: dto.externalTransactionId,
        error: err instanceof Error ? err.message : 'unknown_error',
      });
      throw err;
    }
  }

  async getChargeStatus(
    merchantId: string,
    externalSystem: string,
    externalTransactionId: string,
  ): Promise<IntegrationChargeResponse> {
    const tx = await this.prisma.transaction.findUnique({
      where: {
        externalSystem_externalTransactionId: {
          externalSystem,
          externalTransactionId,
        },
      },
    });
    if (!tx) throw new DomainException('NOT_FOUND', 'Charge not found');

    const wallet = await this.prisma.wallet.findUnique({
      where: { id: tx.walletId },
    });
    if (!wallet || wallet.merchantId !== merchantId) {
      throw new DomainException(
        'FORBIDDEN',
        'Charge does not belong to this merchant',
      );
    }

    return this.toChargeResponse(tx);
  }

  async registerWebhook(
    merchantId: string,
    dto: RegisterWebhookDto,
  ): Promise<{ id: string; url: string; secret: string }> {
    // Reject loopback/private/link-local/cloud-metadata targets up front so a
    // merchant cannot use webhook registration as an SSRF primitive. Checked
    // again immediately before every dispatch (webhook-dispatch.service.ts)
    // since the DNS answer can change between now and then.
    try {
      await assertPublicHostname(new URL(dto.url).hostname);
    } catch (err) {
      if (err instanceof UnsafeWebhookUrlError) {
        throw new DomainException('VALIDATION_ERROR', err.message);
      }
      throw err;
    }

    // The raw secret is only ever returned here, once. From this point on it
    // exists only encrypted (EncryptionService/AES-256-GCM) so it can later
    // be decrypted to sign outgoing webhook payloads (bcrypt would not allow that).
    const secret = randomBytes(32).toString('hex');
    const secretEncrypted = this.encryption.encrypt(secret);

    const endpoint = await this.prisma.webhookEndpoint.create({
      data: { merchantId, url: dto.url, secretEncrypted },
    });

    return { id: endpoint.id, url: endpoint.url, secret };
  }

  async createApiCredential(merchantId: string, name: string) {
    const merchant = await this.prisma.merchant.findUnique({
      where: { id: merchantId },
    });
    if (!merchant) throw new DomainException('NOT_FOUND', 'Merchant not found');

    const apiKey = `qk_live_${randomBytes(16).toString('hex')}`;
    const apiSecret = randomBytes(32).toString('hex');
    const apiSecretHash = hashSync(apiSecret, 10);

    const credential = await this.prisma.merchantApiCredential.create({
      data: { merchantId, name, apiKey, apiSecretHash },
    });

    return { id: credential.id, apiKey, apiSecret };
  }

  async listApiCredentials(merchantId: string) {
    const credentials = await this.prisma.merchantApiCredential.findMany({
      where: { merchantId },
      orderBy: { createdAt: 'desc' },
    });
    return credentials.map((c) => ({
      id: c.id,
      name: c.name,
      status: c.status,
      createdAt: c.createdAt,
    }));
  }

  async revokeApiCredential(merchantId: string, credentialId: string) {
    const credential = await this.prisma.merchantApiCredential.findUnique({
      where: { id: credentialId },
    });
    if (!credential || credential.merchantId !== merchantId) {
      throw new DomainException('NOT_FOUND', 'API credential not found');
    }

    const updated = await this.prisma.merchantApiCredential.update({
      where: { id: credentialId },
      data: { status: 'REVOKED', revokedAt: new Date() },
    });

    return {
      id: updated.id,
      name: updated.name,
      status: updated.status,
      revokedAt: updated.revokedAt,
    };
  }

  private toChargeResponse(
    tx: MinimalTransaction | TransactionResponseDto,
    externalTransactionIdOverride?: string,
  ): IntegrationChargeResponse {
    return {
      qeedhaTransactionId: tx.id,
      externalTransactionId:
        tx.externalTransactionId ?? externalTransactionIdOverride ?? '',
      status: this.mapStatus(tx.status),
      amount: Number(tx.amount),
      currency: 'SAR',
      invoiceReference: tx.invoiceReference ?? null,
      branchReference: tx.branchId ?? null,
      createdAt: tx.createdAt,
    };
  }

  private mapStatus(status: string): 'SUCCESS' | 'PENDING' | 'FAILED' {
    if (status === 'COMPLETED') return 'SUCCESS';
    if (status === 'PENDING') return 'PENDING';
    return 'FAILED';
  }

  private hashRequest(obj: unknown): string {
    return createHash('sha256').update(JSON.stringify(obj)).digest('hex');
  }
}
