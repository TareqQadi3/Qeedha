import { LedgerService } from '../src/ledger/ledger.service';
import { LedgerAccount } from '../src/ledger/ledger.types';
import { createMockPrisma } from './mocks/prisma.mock';

const wallet = { id: 'wallet-1' } as any;

describe('LedgerService', () => {
  let service: LedgerService;
  let prisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    prisma = createMockPrisma();
    service = new LedgerService(prisma);
  });

  it('posts balanced double-entry records', async () => {
    (prisma.ledgerEntry.createMany as jest.Mock).mockResolvedValue({ count: 1 });

    await service.post({
      transactionId: 'tx-1',
      entries: [
        {
          debitAccount: LedgerAccount.ASSET_CUSTOMER_WALLET,
          creditAccount: LedgerAccount.LIABILITY_FINANCING_PROVIDER,
          amount: 100,
        },
      ],
    });

    expect(prisma.ledgerEntry.createMany).toHaveBeenCalledWith({
      data: [
        {
          transactionRef: 'tx-1',
          debitAccount: LedgerAccount.ASSET_CUSTOMER_WALLET,
          creditAccount: LedgerAccount.LIABILITY_FINANCING_PROVIDER,
          amount: 100,
          description: 'ASSET_CUSTOMER_WALLET / LIABILITY_FINANCING_PROVIDER',
        },
      ],
    });
  });

  it('throws when debit and credit accounts are the same', async () => {
    await expect(
      service.post({
        transactionId: 'tx-1',
        entries: [
          {
            debitAccount: LedgerAccount.ASSET_CUSTOMER_WALLET,
            creditAccount: LedgerAccount.ASSET_CUSTOMER_WALLET,
            amount: 100,
          },
        ],
      }),
    ).rejects.toThrow('Debit and credit accounts must be different');
  });

  it('throws when amount is not positive', async () => {
    await expect(
      service.post({
        transactionId: 'tx-1',
        entries: [
          {
            debitAccount: LedgerAccount.ASSET_CUSTOMER_WALLET,
            creditAccount: LedgerAccount.LIABILITY_FINANCING_PROVIDER,
            amount: -50,
          },
        ],
      }),
    ).rejects.toThrow('Ledger amount must be positive');
  });

  it('throws when no entries provided', async () => {
    await expect(
      service.post({
        transactionId: 'tx-1',
        entries: [],
      }),
    ).rejects.toThrow('Ledger entries are required');
  });

  it('returns activation entries', () => {
    const entries = service.activationEntries(1000);
    expect(entries).toHaveLength(1);
    expect(entries[0].debitAccount).toBe(LedgerAccount.ASSET_CUSTOMER_WALLET);
    expect(entries[0].creditAccount).toBe(LedgerAccount.LIABILITY_FINANCING_PROVIDER);
    expect(entries[0].amount).toBe(1000);
  });

  it('returns purchase entries', () => {
    const entries = service.purchaseEntries(150);
    expect(entries[0].debitAccount).toBe(LedgerAccount.LIABILITY_FINANCING_PROVIDER);
    expect(entries[0].creditAccount).toBe(LedgerAccount.RECEIVABLE_MERCHANT_GROSS);
  });

  it('returns refund entries', () => {
    const entries = service.refundEntries(150);
    expect(entries[0].debitAccount).toBe(LedgerAccount.RECEIVABLE_MERCHANT_GROSS);
    expect(entries[0].creditAccount).toBe(LedgerAccount.LIABILITY_FINANCING_PROVIDER);
  });
});
