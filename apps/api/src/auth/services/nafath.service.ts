import { Injectable } from '@nestjs/common';

export type NafathStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';

export interface NafathInitResult {
  transactionId: string;
  status: NafathStatus;
}

export interface NafathStatusResult {
  status: NafathStatus;
  verifiedAt?: Date;
}

@Injectable()
export class NafathService {
  private readonly store = new Map<string, NafathStatus>();

  async initiate(customerId: string, nationalId: string): Promise<NafathInitResult> {
    const transactionId = `nafath-${customerId}-${nationalId}`;
    this.store.set(transactionId, 'PENDING');
    return { transactionId, status: 'PENDING' };
  }

  async getStatus(transactionId: string): Promise<NafathStatusResult> {
    const status = this.store.get(transactionId) ?? 'PENDING';
    return { status, verifiedAt: status === 'VERIFIED' ? new Date() : undefined };
  }

  async verify(transactionId: string): Promise<void> {
    this.store.set(transactionId, 'VERIFIED');
  }
}
