import { Test } from '@nestjs/testing';
import { createHash } from 'crypto';
import { TransactionsService } from '../src/transactions/transactions.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { LedgerService } from '../src/ledger/ledger.service';
import { NotificationsService } from '../src/notifications/notifications.service';
import { AuditService } from '../src/common/services/audit.service';
import { IdempotencyService } from '../src/common/services/idempotency.service';
import { QrService } from '../src/auth/services/qr.service';
import { OtpService } from '../src/auth/services/otp.service';
import { createMockPrisma } from './mocks/prisma.mock';

const mockLedger = () => ({
  post: jest.fn(),
  purchaseEntries: jest.fn(() => [{ debitAccount: 'X', creditAccount: 'Y', amount: 100 }]),
  refundEntries: jest.fn(() => [{ debitAccount: 'Y', creditAccount: 'X', amount: 100 }]),
});

const mockNotifications = () => ({ send: jest.fn() });
const mockAudit = () => ({ log: jest.fn() });
const mockIdempotency = () => ({
  getExisting: jest.fn(),
  store: jest.fn(),
});
const mockQr = () => ({ verify: jest.fn() });
const mockOtp = () => ({ verify: jest.fn(), verifyWithoutConsume: jest.fn() });

function hash(obj: unknown) {
  return createHash('sha256').update(JSON.stringify(obj)).digest('hex');
}

describe('TransactionsService', () => {
  let service: TransactionsService;
  let prisma: ReturnType<typeof createMockPrisma>;
  let ledger: ReturnType<typeof mockLedger>;
  let idempotency: ReturnType<typeof mockIdempotency>;
  let qr: ReturnType<typeof mockQr>;

  beforeEach(async () => {
    prisma = createMockPrisma();
    ledger = mockLedger();
    const notifications = mockNotifications();
    const audit = mockAudit();
    idempotency = mockIdempotency();
    qr = mockQr();
    const otp = mockOtp();

    const module = await Test.createTestingModule({
      providers: [
        TransactionsService,
        { provide: PrismaService, useValue: prisma },
        { provide: LedgerService, useValue: ledger },
        { provide: NotificationsService, useValue: notifications },
        { provide: AuditService, useValue: audit },
        { provide: IdempotencyService, useValue: idempotency },
        { provide: QrService, useValue: qr },
        { provide: OtpService, useValue: otp },
      ],
    }).compile();

    service = module.get<TransactionsService>(TransactionsService);
  });

  function setupWallet(remaining: number) {
    (prisma.wallet.findUnique as jest.Mock).mockResolvedValue({
      id: 'w-1',
      customerId: 'c-1',
      status: 'ACTIVE',
      remainingAmount: remaining,
    });
  }

  function mockTransaction(remainingAfter: number, txId = 'tx-1') {
    (prisma.$transaction as jest.Mock).mockImplementation(async (cb) =>
      cb({
        ...prisma,
        wallet: { update: jest.fn().mockResolvedValue({ remainingAmount: remainingAfter }) },
        transaction: {
          create: jest.fn().mockResolvedValue({
            id: txId,
            walletId: 'w-1',
            type: 'PURCHASE',
            amount: 100,
            method: 'QR',
            status: 'COMPLETED',
            createdAt: new Date(),
          }),
        },
      }),
    );
  }

  it('processes a purchase and posts ledger entries', async () => {
    setupWallet(500);
    qr.verify.mockResolvedValue(true);
    mockTransaction(400);

    const result = await service.pay(
      {
        walletId: 'w-1',
        amount: 100,
        method: 'QR',
        token: 'signed-token-123',
      } as any,
      'idem-1',
    );

    expect(result.id).toBe('tx-1');
    expect(ledger.post).toHaveBeenCalled();
    expect(idempotency.store).toHaveBeenCalled();
  });

  it('returns cached idempotent response when payload matches', async () => {
    const dto = {} as any;
    idempotency.getExisting.mockResolvedValue({
      response: { id: 'cached-tx' },
      requestHash: hash(dto),
    });

    const result = await service.pay(dto, 'idem-1');
    expect(result.id).toBe('cached-tx');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('throws idempotency conflict when payload mismatches', async () => {
    idempotency.getExisting.mockResolvedValue({
      response: { id: 'cached-tx' },
      requestHash: 'old-hash',
    });

    await expect(
      service.pay({ walletId: 'w-1', amount: 100 } as any, 'idem-1'),
    ).rejects.toThrow('Idempotency key conflict: request payload mismatch');
  });

  it('throws when wallet has insufficient balance before transaction', async () => {
    setupWallet(50);
    await expect(
      service.pay(
        { walletId: 'w-1', amount: 100, method: 'QR', token: 'token' } as any,
        'idem-2',
      ),
    ).rejects.toThrow('Insufficient wallet balance');
  });

  it('throws when race condition makes balance negative inside transaction', async () => {
    setupWallet(500);
    qr.verify.mockResolvedValue(true);
    (prisma.$transaction as jest.Mock).mockImplementation(async (cb) =>
      cb({
        ...prisma,
        wallet: { update: jest.fn().mockResolvedValue({ remainingAmount: -50 }) },
        transaction: { create: jest.fn() },
      }),
    );

    await expect(
      service.pay(
        { walletId: 'w-1', amount: 100, method: 'QR', token: 'token' } as any,
        'idem-race',
      ),
    ).rejects.toThrow('Insufficient wallet balance');
  });

  it('throws when wallet is not active', async () => {
    (prisma.wallet.findUnique as jest.Mock).mockResolvedValue({
      id: 'w-1',
      status: 'FROZEN',
      remainingAmount: 1000,
    });
    await expect(
      service.pay(
        { walletId: 'w-1', amount: 100, method: 'QR', token: 'token' } as any,
        'idem-3',
      ),
    ).rejects.toThrow('Wallet is not active');
  });

  it('throws on invalid QR token', async () => {
    setupWallet(1000);
    qr.verify.mockResolvedValue(false);
    await expect(
      service.pay(
        { walletId: 'w-1', amount: 100, method: 'QR', token: 'invalid-token' } as any,
        'idem-4',
      ),
    ).rejects.toThrow('Invalid or expired QR token');
  });

  it('throws on invalid payment OTP format', async () => {
    setupWallet(1000);
    await expect(
      service.pay(
        { walletId: 'w-1', amount: 100, method: 'OTP', token: '12345' } as any,
        'idem-otp',
      ),
    ).rejects.toThrow('Invalid payment OTP');
  });

  it('lists transactions by wallet for the owning customer', async () => {
    const list = [{ id: 'tx-1' }];
    (prisma.wallet.findUnique as jest.Mock).mockResolvedValue({ id: 'w-1', customerId: 'cust-1', merchantId: 'merch-1' });
    (prisma.transaction.findMany as jest.Mock).mockResolvedValue(list);

    const result = await service.listByWallet('w-1', { userId: 'cust-1', type: 'customer' });
    expect(result).toEqual(list);
    expect(prisma.transaction.findMany).toHaveBeenCalledWith({
      where: { walletId: 'w-1' },
      orderBy: { createdAt: 'desc' },
    });
  });

  it('rejects listing another customer\'s wallet transactions', async () => {
    (prisma.wallet.findUnique as jest.Mock).mockResolvedValue({ id: 'w-1', customerId: 'cust-1', merchantId: 'merch-1' });

    await expect(
      service.listByWallet('w-1', { userId: 'someone-else', type: 'customer' }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    expect(prisma.transaction.findMany).not.toHaveBeenCalled();
  });

  it('lists transactions by wallet for a merchant_user of the owning merchant', async () => {
    const list = [{ id: 'tx-1' }];
    (prisma.wallet.findUnique as jest.Mock).mockResolvedValue({ id: 'w-1', customerId: 'cust-1', merchantId: 'merch-1' });
    (prisma.merchantUser.findUnique as jest.Mock).mockResolvedValue({ merchantId: 'merch-1' });
    (prisma.transaction.findMany as jest.Mock).mockResolvedValue(list);

    const result = await service.listByWallet('w-1', { userId: 'mu-1', type: 'merchant_user' });
    expect(result).toEqual(list);
  });

  it('rejects a merchant_user from a different merchant listing this wallet', async () => {
    (prisma.wallet.findUnique as jest.Mock).mockResolvedValue({ id: 'w-1', customerId: 'cust-1', merchantId: 'merch-1' });
    (prisma.merchantUser.findUnique as jest.Mock).mockResolvedValue({ merchantId: 'other-merchant' });

    await expect(
      service.listByWallet('w-1', { userId: 'mu-2', type: 'merchant_user' }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    expect(prisma.transaction.findMany).not.toHaveBeenCalled();
  });

  it('lists transactions by cashier for the cashier themself', async () => {
    const list = [{ id: 'tx-2' }];
    (prisma.transaction.findMany as jest.Mock).mockResolvedValue(list);

    const result = await service.listByCashier('cashier-1', { userId: 'cashier-1', type: 'merchant_user' });
    expect(result).toEqual(list);
    expect(prisma.transaction.findMany).toHaveBeenCalledWith({
      where: { cashierId: 'cashier-1' },
      orderBy: { createdAt: 'desc' },
    });
  });

  it('lets an OWNER view a cashier under the same merchant', async () => {
    const list = [{ id: 'tx-2' }];
    (prisma.merchantUser.findUnique as jest.Mock)
      .mockResolvedValueOnce({ merchantId: 'merch-1', role: 'OWNER' })
      .mockResolvedValueOnce({ merchantId: 'merch-1' });
    (prisma.transaction.findMany as jest.Mock).mockResolvedValue(list);

    const result = await service.listByCashier('cashier-1', { userId: 'owner-1', type: 'merchant_user' });
    expect(result).toEqual(list);
  });

  it('rejects one cashier viewing another cashier\'s transactions', async () => {
    (prisma.merchantUser.findUnique as jest.Mock)
      .mockResolvedValueOnce({ merchantId: 'merch-1', role: 'CASHIER' })
      .mockResolvedValueOnce({ merchantId: 'merch-1' });

    await expect(
      service.listByCashier('cashier-2', { userId: 'cashier-1', type: 'merchant_user' }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    expect(prisma.transaction.findMany).not.toHaveBeenCalled();
  });

  it('rejects a customer querying by cashierId', async () => {
    await expect(
      service.listByCashier('cashier-1', { userId: 'cust-1', type: 'customer' }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('refunds a completed purchase', async () => {
    (prisma.transaction.findUnique as jest.Mock).mockResolvedValue({
      id: 'tx-1',
      walletId: 'w-1',
      type: 'PURCHASE',
      status: 'COMPLETED',
      amount: 100,
      branchId: null,
      cashierId: null,
      method: 'QR',
    });

    (prisma.$transaction as jest.Mock).mockImplementation(async (cb) =>
      cb({
        ...prisma,
        wallet: { update: jest.fn().mockResolvedValue({ remainingAmount: 200 }) },
        transaction: {
          create: jest.fn().mockResolvedValue({
            id: 'tx-2',
            walletId: 'w-1',
            type: 'REFUND',
            amount: 100,
            method: 'QR',
            status: 'COMPLETED',
            createdAt: new Date(),
          }),
        },
      }),
    );

    const result = await service.refund('tx-1', { reason: 'Customer request' }, 'idem-refund');
    expect(result.type).toBe('REFUND');
    expect(ledger.refundEntries).toHaveBeenCalledWith(100);
  });

  it('throws refund when original transaction is not a completed purchase', async () => {
    (prisma.transaction.findUnique as jest.Mock).mockResolvedValue({
      id: 'tx-1',
      type: 'ACTIVATION',
      status: 'COMPLETED',
    });
    await expect(
      service.refund('tx-1', { reason: 'x' }, 'idem-refund-2'),
    ).rejects.toThrow('Transaction cannot be refunded');
  });

  it('returns cached refund response when payload matches', async () => {
    const dto = { reason: 'x' };
    idempotency.getExisting.mockResolvedValue({
      response: { id: 'cached-refund' },
      requestHash: hash({ transactionId: 'tx-1', ...dto }),
    });

    const result = await service.refund('tx-1', dto, 'idem-refund-3');
    expect(result.id).toBe('cached-refund');
  });

  it('throws idempotency conflict on refund when payload mismatches', async () => {
    idempotency.getExisting.mockResolvedValue({
      response: { id: 'cached-refund' },
      requestHash: 'old-hash',
    });

    await expect(
      service.refund('tx-1', { reason: 'x' }, 'idem-refund-3'),
    ).rejects.toThrow('Idempotency key conflict: request payload mismatch');
  });

  it('refunds a partial amount when provided', async () => {
    (prisma.transaction.findUnique as jest.Mock).mockResolvedValue({
      id: 'tx-1',
      walletId: 'w-1',
      type: 'PURCHASE',
      status: 'COMPLETED',
      amount: 100,
      branchId: null,
      cashierId: null,
      method: 'QR',
    });

    (prisma.$transaction as jest.Mock).mockImplementation(async (cb) =>
      cb({
        ...prisma,
        wallet: { update: jest.fn().mockResolvedValue({ remainingAmount: 250 }) },
        transaction: {
          create: jest.fn().mockResolvedValue({
            id: 'tx-3',
            walletId: 'w-1',
            type: 'REFUND',
            amount: 50,
            method: 'QR',
            status: 'COMPLETED',
            createdAt: new Date(),
          }),
        },
      }),
    );

    const result = await service.refund('tx-1', { reason: 'Partial', amount: 50 }, 'idem-partial');
    expect(result.amount).toBe(50);
    expect(ledger.refundEntries).toHaveBeenCalledWith(50);
  });
});
