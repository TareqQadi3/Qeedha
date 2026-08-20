import { Test } from '@nestjs/testing';
import { IntegrationService } from '../src/integration/services/integration.service';
import { WebhookDispatchService } from '../src/integration/services/webhook-dispatch.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { AuditService } from '../src/common/services/audit.service';
import { EncryptionService } from '../src/common/services/encryption.service';
import { IdempotencyService } from '../src/common/services/idempotency.service';
import { TransactionsService } from '../src/transactions/transactions.service';
import { createMockPrisma } from './mocks/prisma.mock';

const mockAudit = () => ({ log: jest.fn() });
const mockEncryption = () => ({
  encrypt: jest.fn((v: string) => `enc:${v}`),
  decrypt: jest.fn((v: string) => v.replace('enc:', '')),
});
const mockIdempotency = () => ({
  getExisting: jest.fn().mockResolvedValue(null),
  store: jest.fn(),
});
const mockTransactions = () => ({
  payFromIntegration: jest.fn(),
  refund: jest.fn(),
});
const mockWebhooks = () => ({ dispatch: jest.fn() });

describe('IntegrationService', () => {
  let service: IntegrationService;
  let prisma: ReturnType<typeof createMockPrisma>;
  let transactions: ReturnType<typeof mockTransactions>;
  let webhooks: ReturnType<typeof mockWebhooks>;

  beforeEach(async () => {
    prisma = createMockPrisma();
    transactions = mockTransactions();
    webhooks = mockWebhooks();

    const module = await Test.createTestingModule({
      providers: [
        IntegrationService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: mockAudit() },
        { provide: EncryptionService, useValue: mockEncryption() },
        { provide: IdempotencyService, useValue: mockIdempotency() },
        { provide: TransactionsService, useValue: transactions },
        { provide: WebhookDispatchService, useValue: webhooks },
      ],
    }).compile();

    service = module.get<IntegrationService>(IntegrationService);
  });

  const chargeDto = () => ({
    externalCustomerId: 'ext-cust-1',
    externalSystem: 'QEEDHA_B',
    externalTransactionId: 'ext-tx-1',
    amount: 100,
    currency: 'SAR',
  });

  describe('createCharge', () => {
    it('charges the wallet and dispatches charge.succeeded on success', async () => {
      (prisma.transaction.findUnique as jest.Mock).mockResolvedValue(null);
      (
        prisma.externalCustomerMapping.findUnique as jest.Mock
      ).mockResolvedValue({
        id: 'map-1',
        merchantId: 'merch-1',
        customerId: 'cust-1',
        externalSystem: 'QEEDHA_B',
        externalCustomerId: 'ext-cust-1',
      });
      (prisma.wallet.findFirst as jest.Mock).mockResolvedValue({
        id: 'wallet-1',
        merchantId: 'merch-1',
        customerId: 'cust-1',
        status: 'ACTIVE',
      });
      transactions.payFromIntegration.mockResolvedValue({
        id: 'tx-1',
        externalTransactionId: 'ext-tx-1',
        status: 'COMPLETED',
        amount: 100,
        branchId: null,
        invoiceReference: null,
        createdAt: new Date(),
      });

      const result = await service.createCharge(
        'merch-1',
        chargeDto(),
        'idem-1',
      );

      expect(result.status).toBe('SUCCESS');
      expect(result.qeedhaTransactionId).toBe('tx-1');
      expect(transactions.payFromIntegration).toHaveBeenCalledTimes(1);
      expect(webhooks.dispatch).toHaveBeenCalledWith(
        'merch-1',
        'charge.succeeded',
        expect.any(Object),
      );
    });

    it('throws NOT_FOUND when the external customer mapping is unknown', async () => {
      (prisma.transaction.findUnique as jest.Mock).mockResolvedValue(null);
      (
        prisma.externalCustomerMapping.findUnique as jest.Mock
      ).mockResolvedValue(null);

      await expect(
        service.createCharge('merch-1', chargeDto() as any, 'idem-3'),
      ).rejects.toMatchObject({
        code: 'NOT_FOUND',
      });
      expect(transactions.payFromIntegration).not.toHaveBeenCalled();
    });

    it('throws VALIDATION_ERROR when currency is not SAR', async () => {
      await expect(
        service.createCharge(
          'merch-1',
          { ...chargeDto(), currency: 'USD' } as any,
          'idem-4',
        ),
      ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
      expect(prisma.transaction.findUnique).not.toHaveBeenCalled();
    });

    it('does not leak another merchant\'s cached transaction on an (externalSystem, externalTransactionId) collision', async () => {
      // The pair is unique across ALL merchants, so a different merchant can
      // supply the exact same (externalSystem, externalTransactionId) and
      // hit the same row. The fast path must verify wallet ownership before
      // returning it, rather than trusting the cache hit alone.
      (prisma.transaction.findUnique as jest.Mock).mockResolvedValue({
        id: 'tx-victim',
        walletId: 'wallet-victim',
        externalTransactionId: 'ext-tx-1',
        status: 'COMPLETED',
        amount: 999,
        branchId: null,
        invoiceReference: 'victim-invoice',
        createdAt: new Date(),
      });
      (prisma.wallet.findUnique as jest.Mock).mockResolvedValue({
        id: 'wallet-victim',
        merchantId: 'victim-merchant',
      });

      await expect(
        service.createCharge('attacker-merchant', chargeDto(), 'idem-attack'),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });
      expect(transactions.payFromIntegration).not.toHaveBeenCalled();
    });

    it('returns the cached transaction when it does belong to the calling merchant', async () => {
      (prisma.transaction.findUnique as jest.Mock).mockResolvedValue({
        id: 'tx-existing',
        walletId: 'wallet-1',
        externalTransactionId: 'ext-tx-1',
        status: 'COMPLETED',
        amount: 100,
        branchId: null,
        invoiceReference: null,
        createdAt: new Date(),
      });
      (prisma.wallet.findUnique as jest.Mock).mockResolvedValue({
        id: 'wallet-1',
        merchantId: 'merch-1',
      });

      const result = await service.createCharge(
        'merch-1',
        chargeDto(),
        'idem-2b',
      );

      expect(result.qeedhaTransactionId).toBe('tx-existing');
      expect(transactions.payFromIntegration).not.toHaveBeenCalled();
    });

    it('throws FORBIDDEN when branchReference does not belong to the merchant', async () => {
      (prisma.transaction.findUnique as jest.Mock).mockResolvedValue(null);
      (
        prisma.externalCustomerMapping.findUnique as jest.Mock
      ).mockResolvedValue({
        id: 'map-1',
        merchantId: 'merch-1',
        customerId: 'cust-1',
      });
      (prisma.wallet.findFirst as jest.Mock).mockResolvedValue({
        id: 'wallet-1',
        merchantId: 'merch-1',
        customerId: 'cust-1',
        status: 'ACTIVE',
      });
      (prisma.branch.findUnique as jest.Mock).mockResolvedValue({
        id: 'branch-other',
        merchantId: 'other-merchant',
      });

      await expect(
        service.createCharge(
          'merch-1',
          { ...chargeDto(), branchReference: 'branch-other' } as any,
          'idem-5',
        ),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });
      expect(transactions.payFromIntegration).not.toHaveBeenCalled();
    });
  });

  describe('getChargeStatus', () => {
    it('enforces tenant isolation across merchants', async () => {
      (prisma.transaction.findUnique as jest.Mock).mockResolvedValue({
        id: 'tx-1',
        walletId: 'wallet-1',
        externalTransactionId: 'ext-tx-1',
        status: 'COMPLETED',
        amount: 100,
        branchId: null,
        invoiceReference: null,
        createdAt: new Date(),
      });
      (prisma.wallet.findUnique as jest.Mock).mockResolvedValue({
        id: 'wallet-1',
        merchantId: 'some-other-merchant',
      });

      await expect(
        service.getChargeStatus('merch-1', 'QEEDHA_B', 'ext-tx-1'),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    });

    it('returns the mapped status when the transaction belongs to the merchant', async () => {
      (prisma.transaction.findUnique as jest.Mock).mockResolvedValue({
        id: 'tx-1',
        walletId: 'wallet-1',
        externalTransactionId: 'ext-tx-1',
        status: 'PENDING',
        amount: 50,
        branchId: null,
        invoiceReference: null,
        createdAt: new Date(),
      });
      (prisma.wallet.findUnique as jest.Mock).mockResolvedValue({
        id: 'wallet-1',
        merchantId: 'merch-1',
      });

      const result = await service.getChargeStatus(
        'merch-1',
        'QEEDHA_B',
        'ext-tx-1',
      );
      expect(result.status).toBe('PENDING');
    });
  });

  describe('registerWebhook', () => {
    it('rejects a loopback/private/link-local/cloud-metadata URL and never persists it', async () => {
      for (const url of [
        'http://127.0.0.1/hook',
        'http://169.254.169.254/latest/meta-data/',
        'http://10.0.0.5:8080/hook',
        'http://localhost/hook',
      ]) {
        await expect(
          service.registerWebhook('merch-1', { url } as any),
        ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
      }
      expect(prisma.webhookEndpoint.create).not.toHaveBeenCalled();
    });

    it('accepts a public URL and stores it with an encrypted (not plaintext) secret', async () => {
      (prisma.webhookEndpoint.create as jest.Mock).mockResolvedValue({
        id: 'ep-1',
        url: 'https://example.com/hook',
      });

      const result = await service.registerWebhook('merch-1', {
        url: 'https://example.com/hook',
      } as any);

      expect(result.url).toBe('https://example.com/hook');
      expect(result.secret).toBeTruthy();
      expect(prisma.webhookEndpoint.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            merchantId: 'merch-1',
            url: 'https://example.com/hook',
            secretEncrypted: expect.stringContaining('enc:'),
          }),
        }),
      );
    });
  });
});
