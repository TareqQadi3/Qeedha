import { Injectable } from '@nestjs/common';
import { DomainException } from '../../common/exceptions/domain.exception';
import { FinancingProvider } from '../financing-provider.interface';
import { ManualAdapter } from '../adapters/manual.adapter';

@Injectable()
export class FinancingGatewayService {
  private readonly adapters = new Map<string, FinancingProvider>();

  constructor(private readonly manual: ManualAdapter) {
    this.register(manual);
  }

  register(provider: FinancingProvider) {
    this.adapters.set(provider.adapterKey, provider);
  }

  get(adapterKey: string): FinancingProvider {
    const adapter = this.adapters.get(adapterKey);
    if (!adapter) {
      throw new DomainException('NOT_FOUND', `Financing adapter ${adapterKey} not found`);
    }
    return adapter;
  }

  listAdapters(): string[] {
    return Array.from(this.adapters.keys());
  }
}
