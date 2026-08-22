import { Injectable } from '@nestjs/common';
import { Settlement, SettlementStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/services/audit.service';
import { DomainException } from '../common/exceptions/domain.exception';

interface ComputeResult {
  settlement: Settlement | null;
  created: boolean;
}

/**
 * Settlement Engine — a READ-SIDE aggregation + payout-workflow layer over already-posted
 * Transaction data. It intentionally does NOT create any LedgerEntry rows.
 *
 * Why: LedgerEntry.transactionRef is a required FK to a single Transaction, and every
 * transaction belongs to a single customer Wallet. A merchant-level settlement aggregates
 * many transactions (across many wallets/customers) into one payout, so there is no single
 * Transaction/Wallet a settlement-level LedgerEntry could attach to under the current schema.
 * Rather than weaken that FK (which would touch the core financial ledger and is out of scope
 * for this phase), settlements are computed by summing already-COMPLETED PURCHASE/REFUND
 * transactions for the period and tracked via their own PENDING -> PAID -> RECONCILED
 * workflow. A future phase could introduce an "operating account" ledger concept to post
 * aggregate payouts if that's ever needed.
 */
@Injectable()
export class SettlementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async computeForPeriod(
    merchantId: string,
    period: string,
  ): Promise<Settlement | null> {
    const { settlement } = await this.computeForPeriodInternal(
      merchantId,
      period,
    );
    return settlement;
  }

  async runForAllMerchants(period: string): Promise<{
    period: string;
    merchantsProcessed: number;
    settlementsCreated: number;
    totalGross: number;
  }> {
    this.validatePeriod(period);

    const merchants = await this.prisma.merchant.findMany({
      where: { status: 'ACTIVE' },
    });

    let settlementsCreated = 0;
    let totalGross = 0;

    for (const merchant of merchants) {
      const { settlement, created } = await this.computeForPeriodInternal(
        merchant.id,
        period,
      );
      if (created && settlement) {
        settlementsCreated += 1;
        totalGross += Number(settlement.gross);
      }
    }

    return {
      period,
      merchantsProcessed: merchants.length,
      settlementsCreated,
      totalGross: this.round2(totalGross),
    };
  }

  async markPaid(id: string, bankRef: string): Promise<Settlement> {
    const settlement = await this.prisma.settlement.findUnique({
      where: { id },
    });
    if (!settlement)
      throw new DomainException('NOT_FOUND', 'Settlement not found');
    if (settlement.status !== 'PENDING') {
      throw new DomainException(
        'CONFLICT',
        'Only PENDING settlements can be marked as paid',
      );
    }

    const updated = await this.prisma.settlement.update({
      where: { id },
      data: { status: 'PAID', bankRef, paidAt: new Date() },
    });

    await this.audit.log({
      actorType: 'platform_staff',
      action: 'SETTLEMENT_MARKED_PAID',
      entity: 'settlement',
      entityId: id,
      before: { status: settlement.status },
      after: { status: 'PAID', bankRef },
    });

    return updated;
  }

  async reconcile(id: string): Promise<Settlement> {
    const settlement = await this.prisma.settlement.findUnique({
      where: { id },
    });
    if (!settlement)
      throw new DomainException('NOT_FOUND', 'Settlement not found');
    if (settlement.status !== 'PAID') {
      throw new DomainException(
        'CONFLICT',
        'Only PAID settlements can be reconciled',
      );
    }

    const updated = await this.prisma.settlement.update({
      where: { id },
      data: { status: 'RECONCILED' },
    });

    await this.audit.log({
      actorType: 'platform_staff',
      action: 'SETTLEMENT_RECONCILED',
      entity: 'settlement',
      entityId: id,
      before: { status: settlement.status },
      after: { status: 'RECONCILED' },
    });

    return updated;
  }

  async listForMerchant(
    merchantId: string,
    status?: SettlementStatus,
  ): Promise<Settlement[]> {
    return this.prisma.settlement.findMany({
      where: { merchantId, ...(status ? { status } : {}) },
      orderBy: { period: 'desc' },
    });
  }

  async listAll(filters: {
    merchantId?: string;
    status?: SettlementStatus;
  }): Promise<Settlement[]> {
    return this.prisma.settlement.findMany({
      where: {
        ...(filters.merchantId ? { merchantId: filters.merchantId } : {}),
        ...(filters.status ? { status: filters.status } : {}),
      },
      orderBy: { period: 'desc' },
    });
  }

  async getById(id: string): Promise<Settlement> {
    const settlement = await this.prisma.settlement.findUnique({
      where: { id },
    });
    if (!settlement)
      throw new DomainException('NOT_FOUND', 'Settlement not found');
    return settlement;
  }

  private async computeForPeriodInternal(
    merchantId: string,
    period: string,
  ): Promise<ComputeResult> {
    this.validatePeriod(period);

    const existing = await this.prisma.settlement.findFirst({
      where: { merchantId, period },
    });
    if (existing) {
      return { settlement: existing, created: false };
    }

    const merchant = await this.prisma.merchant.findUnique({
      where: { id: merchantId },
    });
    if (!merchant) throw new DomainException('NOT_FOUND', 'Merchant not found');

    const { start, end } = this.periodWindow(period);
    const transactions = await this.prisma.transaction.findMany({
      where: {
        wallet: { merchantId },
        status: 'COMPLETED',
        type: { in: ['PURCHASE', 'REFUND'] },
        createdAt: { gte: start, lt: end },
        deletedAt: null,
      },
      select: { type: true, amount: true },
    });

    const gross = this.round2(
      transactions.reduce((sum, tx) => {
        const amount = Number(tx.amount);
        return tx.type === 'PURCHASE' ? sum + amount : sum - amount;
      }, 0),
    );

    if (gross <= 0) {
      return { settlement: null, created: false };
    }

    const commission = this.round2(gross * Number(merchant.commissionRate));
    const net = this.round2(gross - commission);

    const settlement = await this.prisma.settlement.create({
      data: {
        merchantId,
        period,
        gross,
        commission,
        net,
        status: 'PENDING',
      },
    });

    await this.audit.log({
      actorType: 'system',
      action: 'SETTLEMENT_COMPUTED',
      entity: 'settlement',
      entityId: settlement.id,
      after: { merchantId, period, gross, commission, net },
    });

    return { settlement, created: true };
  }

  private validatePeriod(period: string): void {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(period)) {
      throw new DomainException(
        'VALIDATION_ERROR',
        'period must be in YYYY-MM-DD format',
      );
    }
  }

  private periodWindow(period: string): { start: Date; end: Date } {
    const start = new Date(`${period}T00:00:00.000Z`);
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    return { start, end };
  }

  private round2(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }
}
