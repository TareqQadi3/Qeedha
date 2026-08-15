import { Injectable } from '@nestjs/common';
import { FinancingPlan, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { LedgerService } from '../../ledger/ledger.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { AuditService } from '../../common/services/audit.service';
import { DomainException } from '../../common/exceptions/domain.exception';
import { FinancingGatewayService } from './financing-gateway.service';
import { FinancingApplicationStatus, FinancingDecisionStatus, FinancingRequest } from '../financing-provider.interface';

@Injectable()
export class FinancingApplicationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: FinancingGatewayService,
    private readonly ledger: LedgerService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
  ) {}

  async createApplication(
    customerId: string,
    merchantId: string,
    amount: number,
    planType: FinancingPlan,
    adapterKey = 'manual',
  ) {
    const provider = await this.prisma.financingProvider.findUnique({
      where: { adapterKey },
    });
    if (!provider) {
      throw new DomainException('NOT_FOUND', 'Financing provider not found');
    }

    const application = await this.prisma.financingApplication.create({
      data: {
        customerId,
        merchantId,
        providerId: provider.id,
        amount,
        planType,
        status: 'PENDING',
      },
    });

    const request: FinancingRequest = {
      customerId,
      merchantId,
      amount,
      planType: planType as any,
      applicationRef: application.id,
    };

    const adapter = this.gateway.get(adapterKey);
    const decision = await adapter.createApplication(request);

    if (decision.status === FinancingDecisionStatus.APPROVED) {
      await this.approve(application.id, decision.providerRef ?? `${adapterKey}:${application.id}`);
    } else if (decision.status === FinancingDecisionStatus.REJECTED) {
      await this.reject(application.id, decision.reason ?? 'Provider rejected');
    }

    return this.prisma.financingApplication.findUnique({ where: { id: application.id } });
  }

  async approve(applicationId: string, providerRef?: string) {
    const application = await this.prisma.financingApplication.findUnique({
      where: { id: applicationId },
    });
    if (!application) throw new DomainException('NOT_FOUND', 'Application not found');
    if (application.status !== 'PENDING') {
      throw new DomainException('CONFLICT', 'Application already decided');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const app = await tx.financingApplication.update({
        where: { id: applicationId },
        data: {
          status: 'APPROVED',
          providerRef,
          decidedAt: new Date(),
        },
      });

      const wallet = await tx.wallet.create({
        data: {
          customerId: app.customerId,
          merchantId: app.merchantId,
          applicationId: app.id,
          totalAmount: app.amount,
          remainingAmount: app.amount,
          status: 'ACTIVE',
        },
      });

      const ledgerTransaction = await tx.transaction.create({
        data: {
          walletId: wallet.id,
          type: 'ACTIVATION',
          amount: app.amount,
          method: 'MANUAL',
          status: 'COMPLETED',
          idempotencyKey: `activation:${wallet.id}`,
        },
      });

      return { app, wallet, ledgerTransaction };
    });

    await this.ledger.post({
      transactionId: updated.ledgerTransaction.id,
      entries: this.ledger.activationEntries(Number(application.amount)),
    });

    await this.schedulePayments(updated.app);

    await this.notifications.send({
      recipientType: 'customer',
      recipientId: application.customerId,
      channel: 'PUSH',
      template: 'wallet_activated',
      payload: { amount: application.amount, merchantId: application.merchantId },
    });

    await this.audit.log({
      actorId: application.customerId,
      actorType: 'customer',
      action: 'FINANCING_APPLICATION_APPROVED',
      entity: 'financing_application',
      entityId: application.id,
      after: { status: 'APPROVED', walletId: updated.wallet.id },
    });

    return updated.app;
  }

  async reject(applicationId: string, reason: string) {
    const application = await this.prisma.financingApplication.findUnique({
      where: { id: applicationId },
    });
    if (!application) throw new DomainException('NOT_FOUND', 'Application not found');
    if (application.status !== 'PENDING') {
      throw new DomainException('CONFLICT', 'Application already decided');
    }

    const updated = await this.prisma.financingApplication.update({
      where: { id: applicationId },
      data: { status: 'REJECTED', decidedAt: new Date() },
    });

    await this.notifications.send({
      recipientType: 'customer',
      recipientId: application.customerId,
      channel: 'PUSH',
      template: 'application_rejected',
      payload: { reason },
    });

    await this.audit.log({
      actorId: application.customerId,
      actorType: 'customer',
      action: 'FINANCING_APPLICATION_REJECTED',
      entity: 'financing_application',
      entityId: application.id,
      after: { status: 'REJECTED', reason },
    });

    return updated;
  }

  async getApplication(id: string) {
    const app = await this.prisma.financingApplication.findUnique({
      where: { id },
      include: { paymentSchedule: true },
    });
    if (!app) throw new DomainException('NOT_FOUND', 'Application not found');
    return app;
  }

  async listByCustomer(customerId: string) {
    return this.prisma.financingApplication.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listAll() {
    return this.prisma.financingApplication.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async getStatus(id: string): Promise<FinancingApplicationStatus> {
    const app = await this.getApplication(id);
    return { status: app.status as FinancingDecisionStatus, providerRef: app.providerRef ?? undefined };
  }

  private async schedulePayments(application: Prisma.FinancingApplicationGetPayload<{}>) {
    const installments: Prisma.PaymentScheduleCreateManyInput[] = [];
    const amount = Number(application.amount);

    if (application.planType === 'PAY_IN_1') {
      installments.push({
        applicationId: application.id,
        installmentNo: 1,
        amount,
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      });
    } else if (application.planType === 'PAY_IN_30') {
      installments.push({
        applicationId: application.id,
        installmentNo: 1,
        amount,
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });
    } else if (application.planType === 'INSTALLMENTS_4') {
      const installmentAmount = Number((amount / 4).toFixed(4));
      for (let i = 1; i <= 4; i++) {
        installments.push({
          applicationId: application.id,
          installmentNo: i,
          amount: i === 4 ? amount - installmentAmount * 3 : installmentAmount,
          dueDate: new Date(Date.now() + i * 14 * 24 * 60 * 60 * 1000),
        });
      }
    }

    if (installments.length > 0) {
      await this.prisma.paymentSchedule.createMany({ data: installments });
    }
  }
}
