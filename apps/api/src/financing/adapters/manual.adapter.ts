import { Injectable } from '@nestjs/common';
import {
  FinancingApplicationStatus,
  FinancingDecision,
  FinancingDecisionStatus,
  FinancingProvider,
  FinancingRequest,
  FinancingWebhookEvent,
} from '../financing-provider.interface';

@Injectable()
export class ManualAdapter implements FinancingProvider {
  readonly adapterKey = 'manual';

  async createApplication(_req: FinancingRequest): Promise<FinancingDecision> {
    return { status: FinancingDecisionStatus.PENDING };
  }

  async getApplicationStatus(_id: string): Promise<FinancingApplicationStatus> {
    return { status: FinancingDecisionStatus.PENDING };
  }

  async cancelApplication(_id: string): Promise<void> {
    return;
  }

  async reportRefund(_txId: string, _amount: number): Promise<void> {
    return;
  }

  verifyWebhook(payload: unknown, _signature: string): FinancingWebhookEvent {
    return payload as FinancingWebhookEvent;
  }
}
