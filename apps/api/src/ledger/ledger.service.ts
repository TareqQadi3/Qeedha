import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DomainException } from '../common/exceptions/domain.exception';
import { LedgerAccount, LedgerEntryInput, PostTransactionInput } from './ledger.types';

@Injectable()
export class LedgerService {
  constructor(private readonly prisma: PrismaService) {}

  async post(input: PostTransactionInput) {
    if (!input.entries || input.entries.length === 0) {
      throw new DomainException('VALIDATION_ERROR', 'Ledger entries are required');
    }

    const totalDebits = input.entries.reduce((sum, e) => sum + Number(e.amount), 0);
    const totalCredits = totalDebits;

    if (Math.abs(totalDebits - totalCredits) > 0.0001) {
      throw new DomainException('VALIDATION_ERROR', 'Ledger debits and credits are not balanced');
    }

    for (const entry of input.entries) {
      if (!entry.debitAccount || !entry.creditAccount) {
        throw new DomainException('VALIDATION_ERROR', 'Each ledger entry must have debit and credit accounts');
      }
      if (entry.debitAccount === entry.creditAccount) {
        throw new DomainException('VALIDATION_ERROR', 'Debit and credit accounts must be different');
      }
      if (entry.amount <= 0) {
        throw new DomainException('VALIDATION_ERROR', 'Ledger amount must be positive');
      }
    }

    const records = input.entries.map((entry) => ({
      transactionRef: input.transactionId,
      debitAccount: entry.debitAccount,
      creditAccount: entry.creditAccount,
      amount: entry.amount,
      description: entry.description ?? `${entry.debitAccount} / ${entry.creditAccount}`,
    }));

    return this.prisma.ledgerEntry.createMany({
      data: records,
    });
  }

  activationEntries(amount: number): LedgerEntryInput[] {
    return [
      {
        debitAccount: LedgerAccount.ASSET_CUSTOMER_WALLET,
        creditAccount: LedgerAccount.LIABILITY_FINANCING_PROVIDER,
        amount,
        description: 'Wallet activated via financing',
      },
    ];
  }

  purchaseEntries(amount: number): LedgerEntryInput[] {
    return [
      {
        debitAccount: LedgerAccount.LIABILITY_FINANCING_PROVIDER,
        creditAccount: LedgerAccount.RECEIVABLE_MERCHANT_GROSS,
        amount,
        description: 'Purchase deducted from wallet',
      },
    ];
  }

  refundEntries(amount: number): LedgerEntryInput[] {
    return [
      {
        debitAccount: LedgerAccount.RECEIVABLE_MERCHANT_GROSS,
        creditAccount: LedgerAccount.LIABILITY_FINANCING_PROVIDER,
        amount,
        description: 'Refund reversed to wallet',
      },
    ];
  }
}
