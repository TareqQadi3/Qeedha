import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import {
  Prisma,
  TransactionMethod,
  TransactionType,
  OtpPurpose,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LedgerService } from '../ledger/ledger.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../common/services/audit.service';
import { IdempotencyService } from '../common/services/idempotency.service';
import { QrService } from '../auth/services/qr.service';
import { OtpService } from '../auth/services/otp.service';
import { DomainException } from '../common/exceptions/domain.exception';
import {
  PaymentRequestDto,
  RefundRequestDto,
  TransactionResponseDto,
  VerifyPaymentTokenDto,
} from './dto/transaction.dto';

@Injectable()
export class TransactionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
    private readonly idempotency: IdempotencyService,
    private readonly qr: QrService,
    private readonly otp: OtpService,
  ) {}

  async pay(
    dto: PaymentRequestDto,
    idempotencyKey: string,
  ): Promise<TransactionResponseDto> {
    const requestHash = this.hashRequest(dto);
    const existing = await this.idempotency.getExisting<TransactionResponseDto>(
      idempotencyKey,
      'transaction',
    );
    if (existing) {
      if (existing.requestHash !== requestHash) {
        throw new DomainException(
          'CONFLICT',
          'Idempotency key conflict: request payload mismatch',
        );
      }
      if (existing.response === null) {
        throw new DomainException('NOT_FOUND', 'Cached response missing');
      }
      return existing.response;
    }

    const wallet = await this.prisma.wallet.findUnique({
      where: { id: dto.walletId },
    });
    if (!wallet) throw new DomainException('NOT_FOUND', 'Wallet not found');
    if (wallet.status !== 'ACTIVE')
      throw new DomainException('FORBIDDEN', 'Wallet is not active');
    if (Number(wallet.remainingAmount) < dto.amount) {
      throw new DomainException('FORBIDDEN', 'Insufficient wallet balance');
    }

    await this.verifyPaymentToken(dto.method, dto.token, wallet.customerId);

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedWallet = await tx.wallet.update({
        where: { id: dto.walletId },
        data: { remainingAmount: { decrement: dto.amount } },
      });

      if (Number(updatedWallet.remainingAmount) < 0) {
        throw new DomainException('FORBIDDEN', 'Insufficient wallet balance');
      }

      const transaction = await tx.transaction.create({
        data: {
          walletId: dto.walletId,
          branchId: dto.branchId ?? null,
          cashierId: dto.cashierId ?? null,
          type: 'PURCHASE',
          amount: dto.amount,
          method: dto.method,
          status: 'COMPLETED',
          idempotencyKey,
          metadata: (dto.metadata ?? Prisma.JsonNull) as any,
        },
      });

      return { transaction, updatedWallet };
    });

    await this.ledger.post({
      transactionId: result.transaction.id,
      entries: this.ledger.purchaseEntries(dto.amount),
    });

    const response = this.toDto(
      result.transaction,
      Number(result.updatedWallet.remainingAmount),
    );

    await this.idempotency.store(
      idempotencyKey,
      'transaction',
      result.transaction.id,
      requestHash,
      response,
      86400,
    );

    await this.notifications.send({
      recipientType: 'customer',
      recipientId: wallet.customerId,
      channel: 'PUSH',
      template: 'purchase_completed',
      payload: {
        amount: dto.amount,
        remaining: Number(result.updatedWallet.remainingAmount),
      },
    });

    await this.audit.log({
      actorId: dto.cashierId,
      actorType: 'merchant_user',
      action: 'PURCHASE_COMPLETED',
      entity: 'transaction',
      entityId: result.transaction.id,
      after: response as unknown as Record<string, unknown>,
    });

    return response;
  }

  async refund(
    transactionId: string,
    dto: RefundRequestDto,
    idempotencyKey: string,
  ): Promise<TransactionResponseDto> {
    const requestHash = this.hashRequest({ transactionId, ...dto });
    const existing = await this.idempotency.getExisting<TransactionResponseDto>(
      idempotencyKey,
      'transaction_refund',
    );
    if (existing) {
      if (existing.requestHash !== requestHash) {
        throw new DomainException(
          'CONFLICT',
          'Idempotency key conflict: request payload mismatch',
        );
      }
      if (existing.response === null) {
        throw new DomainException('NOT_FOUND', 'Cached response missing');
      }
      return existing.response;
    }

    const original = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
    });
    if (
      !original ||
      original.type !== 'PURCHASE' ||
      original.status !== 'COMPLETED'
    ) {
      throw new DomainException('CONFLICT', 'Transaction cannot be refunded');
    }

    const refundAmount = dto.amount ?? Number(original.amount);

    const result = await this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.update({
        where: { id: original.walletId },
        data: { remainingAmount: { increment: refundAmount } },
      });

      const transaction = await tx.transaction.create({
        data: {
          walletId: original.walletId,
          branchId: original.branchId,
          cashierId: original.cashierId,
          type: 'REFUND',
          amount: refundAmount,
          method: original.method,
          status: 'COMPLETED',
          idempotencyKey,
          metadata: { reason: dto.reason } as any,
        },
      });

      return { transaction, wallet };
    });

    await this.ledger.post({
      transactionId: result.transaction.id,
      entries: this.ledger.refundEntries(refundAmount),
    });

    const response = this.toDto(result.transaction);

    await this.idempotency.store(
      idempotencyKey,
      'transaction_refund',
      result.transaction.id,
      requestHash,
      response,
      86400,
    );

    await this.audit.log({
      actorId: original.cashierId ?? undefined,
      actorType: 'merchant_user',
      action: 'PURCHASE_REFUNDED',
      entity: 'transaction',
      entityId: result.transaction.id,
      after: response as unknown as Record<string, unknown>,
    });

    return response;
  }

  /**
   * Charges a wallet on behalf of a server-to-server integration (e.g. Qeedha B).
   * Mirrors pay()'s DB-transaction/ledger/notification/audit block, but skips
   * verifyPaymentToken entirely — the ApiCredentialGuard already established
   * server-to-server trust — and stamps the external* columns used to keep
   * the integration idempotent on (externalSystem, externalTransactionId).
   */
  async payFromIntegration(
    dto: {
      walletId: string;
      amount: number;
      branchId?: string;
      externalTransactionId: string;
      externalSystem: string;
      invoiceReference?: string;
      metadata?: Record<string, unknown>;
    },
    idempotencyKey: string,
  ): Promise<TransactionResponseDto> {
    const wallet = await this.prisma.wallet.findUnique({
      where: { id: dto.walletId },
    });
    if (!wallet) throw new DomainException('NOT_FOUND', 'Wallet not found');
    if (wallet.status !== 'ACTIVE')
      throw new DomainException('FORBIDDEN', 'Wallet is not active');
    if (Number(wallet.remainingAmount) < dto.amount) {
      throw new DomainException('FORBIDDEN', 'Insufficient wallet balance');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedWallet = await tx.wallet.update({
        where: { id: dto.walletId },
        data: { remainingAmount: { decrement: dto.amount } },
      });

      if (Number(updatedWallet.remainingAmount) < 0) {
        throw new DomainException('FORBIDDEN', 'Insufficient wallet balance');
      }

      const transaction = await tx.transaction.create({
        data: {
          walletId: dto.walletId,
          branchId: dto.branchId ?? null,
          cashierId: null,
          type: 'PURCHASE',
          amount: dto.amount,
          method: 'MANUAL',
          status: 'COMPLETED',
          idempotencyKey,
          metadata: (dto.metadata ?? Prisma.JsonNull) as any,
          externalTransactionId: dto.externalTransactionId,
          externalSystem: dto.externalSystem,
          invoiceReference: dto.invoiceReference ?? null,
        },
      });

      return { transaction, updatedWallet };
    });

    await this.ledger.post({
      transactionId: result.transaction.id,
      entries: this.ledger.purchaseEntries(dto.amount),
    });

    const response = this.toDto(
      result.transaction,
      Number(result.updatedWallet.remainingAmount),
    );

    await this.notifications.send({
      recipientType: 'customer',
      recipientId: wallet.customerId,
      channel: 'PUSH',
      template: 'purchase_completed',
      payload: {
        amount: dto.amount,
        remaining: Number(result.updatedWallet.remainingAmount),
      },
    });

    await this.audit.log({
      actorType: 'integration',
      action: 'INTEGRATION_CHARGE_COMPLETED',
      entity: 'transaction',
      entityId: result.transaction.id,
      after: response as unknown as Record<string, unknown>,
    });

    return response;
  }

  async listByWallet(
    walletId: string,
    caller: { userId: string; type: string },
  ) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { id: walletId },
    });
    if (!wallet) throw new DomainException('NOT_FOUND', 'Wallet not found');

    if (caller.type === 'customer') {
      if (wallet.customerId !== caller.userId) {
        throw new DomainException(
          'FORBIDDEN',
          'Wallet does not belong to this customer',
        );
      }
    } else if (caller.type === 'merchant_user') {
      const merchantUser = await this.prisma.merchantUser.findUnique({
        where: { id: caller.userId },
        select: { merchantId: true },
      });
      if (!merchantUser || merchantUser.merchantId !== wallet.merchantId) {
        throw new DomainException(
          'FORBIDDEN',
          'Wallet does not belong to this merchant',
        );
      }
    } else {
      throw new DomainException('FORBIDDEN', 'Unsupported caller type');
    }

    return this.prisma.transaction.findMany({
      where: { walletId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listByCashier(
    cashierId: string,
    caller: { userId: string; type: string },
  ) {
    if (caller.type !== 'merchant_user') {
      throw new DomainException('FORBIDDEN', 'Merchant user access required');
    }

    if (caller.userId !== cashierId) {
      const [callerUser, targetCashier] = await Promise.all([
        this.prisma.merchantUser.findUnique({
          where: { id: caller.userId },
          select: { merchantId: true, role: true },
        }),
        this.prisma.merchantUser.findUnique({
          where: { id: cashierId },
          select: { merchantId: true },
        }),
      ]);
      const canViewOthers =
        callerUser?.role === 'OWNER' || callerUser?.role === 'MANAGER';
      if (
        !callerUser ||
        !targetCashier ||
        callerUser.merchantId !== targetCashier.merchantId ||
        !canViewOthers
      ) {
        throw new DomainException(
          'FORBIDDEN',
          "Cannot view another cashier's transactions",
        );
      }
    }

    return this.prisma.transaction.findMany({
      where: { cashierId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async previewPaymentToken(dto: VerifyPaymentTokenDto): Promise<{
    customerId: string;
    fullName: string;
    phone: string;
    walletId: string;
    balance: number;
  }> {
    if (dto.method === 'QR') {
      const [customerId, code] = dto.token.split(':');
      if (!customerId || !code) {
        throw new DomainException('UNAUTHORIZED', 'صيغة رمز QR غير صحيحة');
      }
      const valid = await this.qr.verifyWithoutMarking(customerId, code);
      if (!valid) {
        throw new DomainException('UNAUTHORIZED', 'رمز QR منتهي أو غير صالح');
      }
      const customer = await this.prisma.customer.findUnique({
        where: { id: customerId },
      });
      if (!customer) throw new DomainException('NOT_FOUND', 'العميل غير موجود');
      const wallet = await this.findActiveWallet(customerId);
      return {
        customerId: customer.id,
        fullName: customer.fullName,
        phone: customer.phone,
        walletId: wallet.id,
        balance: Number(wallet.remainingAmount),
      };
    }
    if (dto.method === 'OTP') {
      if (!dto.phone) {
        throw new DomainException('VALIDATION_ERROR', 'رقم الجوال مطلوب');
      }
      if (!/^\d{6}$/.test(dto.token)) {
        throw new DomainException(
          'VALIDATION_ERROR',
          'الرمز يجب أن يكون 6 أرقام',
        );
      }
      const ok = await this.otp.verifyWithoutConsume(
        dto.phone,
        OtpPurpose.PAYMENT,
        dto.token,
      );
      if (!ok) {
        throw new DomainException(
          'UNAUTHORIZED',
          'رمز التحقق غير صحيح أو منتهي',
        );
      }
      const customer = await this.prisma.customer.findUnique({
        where: { phone: dto.phone },
      });
      if (!customer) throw new DomainException('NOT_FOUND', 'العميل غير موجود');
      const wallet = await this.findActiveWallet(customer.id);
      return {
        customerId: customer.id,
        fullName: customer.fullName,
        phone: customer.phone,
        walletId: wallet.id,
        balance: Number(wallet.remainingAmount),
      };
    }
    throw new DomainException('VALIDATION_ERROR', 'طريقة تحقق غير مدعومة');
  }

  private async findActiveWallet(customerId: string) {
    const wallet = await this.prisma.wallet.findFirst({
      where: { customerId, status: 'ACTIVE' },
    });
    if (!wallet)
      throw new DomainException('NOT_FOUND', 'لا توجد محفظة نشطة لهذا العميل');
    return wallet;
  }

  private async verifyPaymentToken(
    method: TransactionMethod,
    token: string,
    customerId: string,
  ) {
    if (method === 'QR') {
      const valid = await this.qr.verify(customerId, token);
      if (!valid) {
        throw new DomainException(
          'UNAUTHORIZED',
          'Invalid or expired QR token',
        );
      }
    }
    if (method === 'OTP') {
      if (!/^\d{6}$/.test(token)) {
        throw new DomainException('UNAUTHORIZED', 'Invalid payment OTP');
      }
      const customer = await this.prisma.customer.findUnique({
        where: { id: customerId },
        select: { phone: true },
      });
      if (!customer) {
        throw new DomainException('NOT_FOUND', 'Customer not found');
      }
      await this.otp.verify(customer.phone, OtpPurpose.PAYMENT, token);
    }
  }

  private hashRequest(obj: unknown): string {
    return createHash('sha256').update(JSON.stringify(obj)).digest('hex');
  }

  private toDto(
    tx: Awaited<ReturnType<PrismaService['transaction']['findUnique']>>,
    remainingAmount?: number,
  ): TransactionResponseDto {
    if (!tx) throw new DomainException('NOT_FOUND', 'Transaction not found');
    return {
      id: tx.id,
      walletId: tx.walletId,
      type: tx.type,
      amount: Number(tx.amount),
      method: tx.method,
      status: tx.status,
      createdAt: tx.createdAt,
      remainingAmount,
      branchId: tx.branchId,
      externalTransactionId: tx.externalTransactionId,
      externalSystem: tx.externalSystem,
      invoiceReference: tx.invoiceReference,
    };
  }
}
