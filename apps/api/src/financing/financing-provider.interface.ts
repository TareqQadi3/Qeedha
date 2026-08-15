export enum FinancingDecisionStatus {
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  PENDING = 'PENDING',
}

export interface FinancingRequest {
  customerId: string;
  merchantId: string;
  amount: number;
  planType: 'PAY_IN_1' | 'PAY_IN_30' | 'INSTALLMENTS_4';
  applicationRef: string;
}

export interface FinancingDecision {
  status: FinancingDecisionStatus;
  providerRef?: string;
  reason?: string;
}

export interface FinancingApplicationStatus {
  status: FinancingDecisionStatus;
  providerRef?: string;
}

export interface FinancingWebhookEvent {
  event: string;
  providerRef: string;
  applicationRef?: string;
  amount?: number;
  occurredAt: Date;
}

export interface FinancingProvider {
  readonly adapterKey: string;
  createApplication(req: FinancingRequest): Promise<FinancingDecision>;
  getApplicationStatus(id: string): Promise<FinancingApplicationStatus>;
  cancelApplication(id: string): Promise<void>;
  reportRefund(txId: string, amount: number): Promise<void>;
  verifyWebhook(payload: unknown, signature: string): FinancingWebhookEvent;
}
