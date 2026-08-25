import { Test } from '@nestjs/testing';
import { MerchantsService } from '../src/merchants/merchants.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { EncryptionService } from '../src/common/services/encryption.service';
import { createMockPrisma } from './mocks/prisma.mock';

const mockEncryption = () => ({
  encrypt: jest.fn((v: string) => `enc:${v}`),
  decrypt: jest.fn((v: string) => v.replace('enc:', '')),
});

describe('MerchantsService — cross-merchant access', () => {
  let service: MerchantsService;
  let prisma: ReturnType<typeof createMockPrisma>;

  beforeEach(async () => {
    prisma = createMockPrisma();

    const module = await Test.createTestingModule({
      providers: [
        MerchantsService,
        { provide: PrismaService, useValue: prisma },
        { provide: EncryptionService, useValue: mockEncryption() },
      ],
    }).compile();

    service = module.get<MerchantsService>(MerchantsService);
  });

  const asOwnMerchant = () =>
    (prisma.merchantUser.findUnique as jest.Mock).mockResolvedValue({ merchantId: 'merch-1' });
  const asOtherMerchant = () =>
    (prisma.merchantUser.findUnique as jest.Mock).mockResolvedValue({ merchantId: 'other-merchant' });

  describe('findById', () => {
    it('allows a merchant_user to view their own merchant', async () => {
      asOwnMerchant();
      (prisma.merchant.findUnique as jest.Mock).mockResolvedValue({ id: 'merch-1', name: 'X' });

      const result = await service.findById('merch-1', 'caller-1');
      expect(result).toEqual({ id: 'merch-1', name: 'X' });
    });

    it("rejects viewing another merchant's data", async () => {
      asOtherMerchant();
      await expect(service.findById('merch-1', 'caller-1')).rejects.toMatchObject({
        code: 'FORBIDDEN',
      });
      expect(prisma.merchant.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it("rejects updating another merchant's IBAN/name", async () => {
      asOtherMerchant();
      await expect(
        service.update('merch-1', { iban: 'SA00...' } as any, 'caller-1'),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });
      expect(prisma.merchant.update).not.toHaveBeenCalled();
    });
  });

  describe('createBranch / listBranches', () => {
    it("rejects creating a branch under another merchant", async () => {
      asOtherMerchant();
      await expect(
        service.createBranch('merch-1', { name: 'Branch' } as any, 'caller-1'),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });
      expect(prisma.branch.create).not.toHaveBeenCalled();
    });

    it("rejects listing another merchant's branches", async () => {
      asOtherMerchant();
      await expect(service.listBranches('merch-1', 'caller-1')).rejects.toMatchObject({
        code: 'FORBIDDEN',
      });
      expect(prisma.branch.findMany).not.toHaveBeenCalled();
    });
  });

  describe('createUser / listUsers / updateUser', () => {
    it("rejects creating a merchant_user under another merchant (privilege-escalation vector)", async () => {
      asOtherMerchant();
      await expect(
        service.createUser('merch-1', { fullName: 'x', phone: '+9665', password: 'p', role: 'OWNER' } as any, 'caller-1'),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });
      expect(prisma.merchantUser.create).not.toHaveBeenCalled();
    });

    it("rejects listing another merchant's users", async () => {
      asOtherMerchant();
      await expect(service.listUsers('merch-1', 'caller-1')).rejects.toMatchObject({
        code: 'FORBIDDEN',
      });
      expect(prisma.merchantUser.findMany).not.toHaveBeenCalled();
    });

    it("rejects updating a user under another merchant even with a valid target userId+merchantId pair", async () => {
      asOtherMerchant();
      await expect(
        service.updateUser('merch-1', 'target-user', { role: 'MANAGER' } as any, 'caller-1'),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });
      expect(prisma.merchantUser.update).not.toHaveBeenCalled();
    });
  });

  describe('listTransactions', () => {
    it('returns transactions scoped to the merchant, most recent first', async () => {
      asOwnMerchant();
      const transactions = [
        { id: 'tx-2', walletId: 'w-2', createdAt: new Date('2026-08-20') },
        { id: 'tx-1', walletId: 'w-1', createdAt: new Date('2026-08-19') },
      ];
      (prisma.transaction.findMany as jest.Mock).mockResolvedValue(transactions);

      const result = await service.listTransactions('merch-1', 'caller-1', {});

      expect(result).toEqual(transactions);
      expect(prisma.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ wallet: { merchantId: 'merch-1' } }),
          orderBy: { createdAt: 'desc' },
          take: 50,
          skip: 0,
        }),
      );
    });

    it('applies branchId/status filters and caps take at 200', async () => {
      asOwnMerchant();
      (prisma.transaction.findMany as jest.Mock).mockResolvedValue([]);

      await service.listTransactions('merch-1', 'caller-1', {
        branchId: 'branch-1',
        status: 'COMPLETED',
        take: 9999,
        skip: 10,
      });

      expect(prisma.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            wallet: { merchantId: 'merch-1' },
            branchId: 'branch-1',
            status: 'COMPLETED',
          },
          take: 200,
          skip: 10,
        }),
      );
    });

    it("rejects listing another merchant's transactions", async () => {
      asOtherMerchant();
      await expect(service.listTransactions('merch-1', 'caller-1', {})).rejects.toMatchObject({
        code: 'FORBIDDEN',
      });
      expect(prisma.transaction.findMany).not.toHaveBeenCalled();
    });
  });
});
