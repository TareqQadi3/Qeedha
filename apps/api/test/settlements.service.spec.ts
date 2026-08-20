import { Test } from '@nestjs/testing';
import { SettlementsService } from '../src/settlements/settlements.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { AuditService } from '../src/common/services/audit.service';
import { createMockPrisma } from './mocks/prisma.mock';

const mockAudit = () => ({
  log: jest.fn(),
});

const merchant = {
  id: 'merchant-1',
  name: 'Test Grocery',
  crNumber: '1234567890',
  ibanEncrypted: null,
  commissionRate: 0.03,
  status: 'ACTIVE',
  ownerId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

describe('SettlementsService', () => {
  let service: SettlementsService;
  let prisma: ReturnType<typeof createMockPrisma>;
  let audit: ReturnType<typeof mockAudit>;

  beforeEach(async () => {
    prisma = createMockPrisma();
    audit = mockAudit();

    const module = await Test.createTestingModule({
      providers: [
        SettlementsService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();

    service = module.get<SettlementsService>(SettlementsService);
  });

  describe('computeForPeriod', () => {
    it('rejects an invalid period format', async () => {
      await expect(service.computeForPeriod('merchant-1', '2026-8-1')).rejects.toMatchObject({
        code: 'VALIDATION_ERROR',
      });
      expect(prisma.settlement.findFirst).not.toHaveBeenCalled();
    });

    it('throws NOT_FOUND when the merchant does not exist', async () => {
      (prisma.settlement.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.merchant.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.computeForPeriod('missing-merchant', '2026-08-01')).rejects.toMatchObject({
        code: 'NOT_FOUND',
      });
    });

    it('computes gross/commission/net correctly from a mix of PURCHASE and REFUND transactions', async () => {
      (prisma.settlement.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.merchant.findUnique as jest.Mock).mockResolvedValue(merchant);
      (prisma.transaction.findMany as jest.Mock).mockResolvedValue([
        { type: 'PURCHASE', amount: 1000 },
        { type: 'PURCHASE', amount: 500 },
        { type: 'REFUND', amount: 200 },
      ]);
      (prisma.settlement.create as jest.Mock).mockImplementation(({ data }) => ({
        id: 'settlement-1',
        createdAt: new Date(),
        paidAt: null,
        bankRef: null,
        ...data,
      }));

      const result = await service.computeForPeriod('merchant-1', '2026-08-01');

      // gross = 1000 + 500 - 200 = 1300; commission = 1300 * 0.03 = 39; net = 1261
      expect(result).not.toBeNull();
      expect(result!.gross).toBe(1300);
      expect(result!.commission).toBe(39);
      expect(result!.net).toBe(1261);
      expect(result!.status).toBe('PENDING');
      expect(prisma.settlement.create).toHaveBeenCalledTimes(1);
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'SETTLEMENT_COMPUTED', entity: 'settlement' }),
      );

      const [[queryArgs]] = (prisma.transaction.findMany as jest.Mock).mock.calls;
      expect(queryArgs.where.wallet).toEqual({ merchantId: 'merchant-1' });
      expect(queryArgs.where.status).toBe('COMPLETED');
      expect(queryArgs.where.type).toEqual({ in: ['PURCHASE', 'REFUND'] });
      expect(queryArgs.where.createdAt.gte.toISOString()).toBe('2026-08-01T00:00:00.000Z');
      expect(queryArgs.where.createdAt.lt.toISOString()).toBe('2026-08-02T00:00:00.000Z');
    });

    it('is idempotent: a second call for the same merchant+period returns the existing row without recomputing', async () => {
      const existing = {
        id: 'settlement-existing',
        merchantId: 'merchant-1',
        period: '2026-08-01',
        gross: 1300,
        commission: 39,
        net: 1261,
        status: 'PENDING',
        bankRef: null,
        createdAt: new Date(),
        paidAt: null,
      };
      (prisma.settlement.findFirst as jest.Mock).mockResolvedValue(existing);

      const result = await service.computeForPeriod('merchant-1', '2026-08-01');

      expect(result).toEqual(existing);
      expect(prisma.merchant.findUnique).not.toHaveBeenCalled();
      expect(prisma.transaction.findMany).not.toHaveBeenCalled();
      expect(prisma.settlement.create).not.toHaveBeenCalled();
    });

    it('does not create a settlement when gross is zero or negative', async () => {
      (prisma.settlement.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.merchant.findUnique as jest.Mock).mockResolvedValue(merchant);
      (prisma.transaction.findMany as jest.Mock).mockResolvedValue([
        { type: 'PURCHASE', amount: 100 },
        { type: 'REFUND', amount: 150 },
      ]);

      const result = await service.computeForPeriod('merchant-1', '2026-08-01');

      expect(result).toBeNull();
      expect(prisma.settlement.create).not.toHaveBeenCalled();
    });
  });

  describe('runForAllMerchants', () => {
    it('processes only ACTIVE merchants and sums newly created settlements', async () => {
      (prisma.merchant.findMany as jest.Mock).mockResolvedValue([merchant, { ...merchant, id: 'merchant-2' }]);
      (prisma.settlement.findFirst as jest.Mock)
        .mockResolvedValueOnce(null) // merchant-1: new
        .mockResolvedValueOnce({
          id: 'existing',
          merchantId: 'merchant-2',
          period: '2026-08-01',
          gross: 500,
          commission: 15,
          net: 485,
          status: 'PENDING',
          bankRef: null,
          createdAt: new Date(),
          paidAt: null,
        }); // merchant-2: already exists
      (prisma.merchant.findUnique as jest.Mock).mockResolvedValue(merchant);
      (prisma.transaction.findMany as jest.Mock).mockResolvedValue([{ type: 'PURCHASE', amount: 1000 }]);
      (prisma.settlement.create as jest.Mock).mockImplementation(({ data }) => ({
        id: 'settlement-new',
        createdAt: new Date(),
        paidAt: null,
        bankRef: null,
        ...data,
      }));

      const summary = await service.runForAllMerchants('2026-08-01');

      expect(prisma.merchant.findMany).toHaveBeenCalledWith({ where: { status: 'ACTIVE' } });
      expect(summary.merchantsProcessed).toBe(2);
      expect(summary.settlementsCreated).toBe(1);
      expect(summary.totalGross).toBe(1000);
    });
  });

  describe('markPaid', () => {
    it('marks a PENDING settlement as PAID and records bankRef', async () => {
      const pending = {
        id: 's-1',
        merchantId: 'merchant-1',
        period: '2026-08-01',
        gross: 1000,
        commission: 30,
        net: 970,
        status: 'PENDING',
        bankRef: null,
        createdAt: new Date(),
        paidAt: null,
      };
      (prisma.settlement.findUnique as jest.Mock).mockResolvedValue(pending);
      (prisma.settlement.update as jest.Mock).mockImplementation(({ data }) => ({ ...pending, ...data }));

      const result = await service.markPaid('s-1', 'BANK-REF-123');

      expect(result.status).toBe('PAID');
      expect(result.bankRef).toBe('BANK-REF-123');
      expect(result.paidAt).toBeInstanceOf(Date);
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'SETTLEMENT_MARKED_PAID' }),
      );
    });

    it('rejects marking paid a settlement that is not PENDING', async () => {
      (prisma.settlement.findUnique as jest.Mock).mockResolvedValue({
        id: 's-1',
        status: 'PAID',
      });

      await expect(service.markPaid('s-1', 'BANK-REF-123')).rejects.toMatchObject({ code: 'CONFLICT' });
      expect(prisma.settlement.update).not.toHaveBeenCalled();
    });

    it('throws NOT_FOUND for an unknown settlement', async () => {
      (prisma.settlement.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(service.markPaid('missing', 'ref')).rejects.toMatchObject({ code: 'NOT_FOUND' });
    });
  });

  describe('reconcile', () => {
    it('reconciles a PAID settlement', async () => {
      const paid = {
        id: 's-1',
        status: 'PAID',
        merchantId: 'merchant-1',
        period: '2026-08-01',
      };
      (prisma.settlement.findUnique as jest.Mock).mockResolvedValue(paid);
      (prisma.settlement.update as jest.Mock).mockImplementation(({ data }) => ({ ...paid, ...data }));

      const result = await service.reconcile('s-1');

      expect(result.status).toBe('RECONCILED');
      expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'SETTLEMENT_RECONCILED' }));
    });

    it('rejects reconciling a settlement that is not PAID', async () => {
      (prisma.settlement.findUnique as jest.Mock).mockResolvedValue({ id: 's-1', status: 'PENDING' });

      await expect(service.reconcile('s-1')).rejects.toMatchObject({ code: 'CONFLICT' });
      expect(prisma.settlement.update).not.toHaveBeenCalled();
    });
  });

  describe('listForMerchant / listAll / getById', () => {
    it('scopes listForMerchant to the given merchant only', async () => {
      (prisma.settlement.findMany as jest.Mock).mockResolvedValue([]);
      await service.listForMerchant('merchant-1');
      expect(prisma.settlement.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { merchantId: 'merchant-1' } }),
      );
    });

    it('returns NOT_FOUND from getById when missing', async () => {
      (prisma.settlement.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(service.getById('missing')).rejects.toMatchObject({ code: 'NOT_FOUND' });
    });
  });
});
