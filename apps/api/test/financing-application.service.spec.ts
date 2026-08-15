import { Test } from '@nestjs/testing';
import { FinancingApplicationService } from '../src/financing/services/financing-application.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { FinancingGatewayService } from '../src/financing/services/financing-gateway.service';
import { LedgerService } from '../src/ledger/ledger.service';
import { NotificationsService } from '../src/notifications/notifications.service';
import { AuditService } from '../src/common/services/audit.service';
import { ManualAdapter } from '../src/financing/adapters/manual.adapter';
import { createMockPrisma } from './mocks/prisma.mock';

const mockLedger = () => ({
  post: jest.fn(),
  activationEntries: jest.fn(() => [{ debitAccount: 'X', creditAccount: 'Y', amount: 1000 }]),
});
const mockNotifications = () => ({ send: jest.fn() });
const mockAudit = () => ({ log: jest.fn() });

describe('FinancingApplicationService', () => {
  let service: FinancingApplicationService;
  let prisma: ReturnType<typeof createMockPrisma>;
  let ledger: ReturnType<typeof mockLedger>;

  beforeEach(async () => {
    prisma = createMockPrisma();
    ledger = mockLedger();
    const notifications = mockNotifications();
    const audit = mockAudit();
    const manualAdapter = new ManualAdapter();
    const gateway = new FinancingGatewayService(manualAdapter);

    const module = await Test.createTestingModule({
      providers: [
        FinancingApplicationService,
        { provide: PrismaService, useValue: prisma },
        { provide: FinancingGatewayService, useValue: gateway },
        { provide: LedgerService, useValue: ledger },
        { provide: NotificationsService, useValue: notifications },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();

    service = module.get<FinancingApplicationService>(FinancingApplicationService);
  });

  it('creates a pending manual application', async () => {
    (prisma.financingProvider.findUnique as jest.Mock).mockResolvedValue({ id: 'p-1', adapterKey: 'manual' });
    (prisma.financingApplication.create as jest.Mock).mockResolvedValue({
      id: 'app-1',
      customerId: 'c-1',
      merchantId: 'm-1',
      providerId: 'p-1',
      amount: 1000,
      planType: 'PAY_IN_1',
      status: 'PENDING',
    });
    (prisma.financingApplication.findUnique as jest.Mock).mockResolvedValue({ id: 'app-1', status: 'PENDING' });

    const result = await service.createApplication('c-1', 'm-1', 1000, 'PAY_IN_1');
    expect(result?.status).toBe('PENDING');
    expect(prisma.financingApplication.create).toHaveBeenCalled();
  });

  it('approves application and creates wallet + ledger entries', async () => {
    (prisma.financingApplication.findUnique as jest.Mock).mockResolvedValue({
      id: 'app-1',
      customerId: 'c-1',
      merchantId: 'm-1',
      amount: 1000,
      planType: 'PAY_IN_1',
      status: 'PENDING',
    });

    (prisma.$transaction as jest.Mock).mockImplementation(async (cb) =>
      cb({
        ...prisma,
        financingApplication: {
          update: jest.fn().mockResolvedValue({
            id: 'app-1',
            customerId: 'c-1',
            merchantId: 'm-1',
            amount: 1000,
            status: 'APPROVED',
          }),
        },
        wallet: {
          create: jest.fn().mockResolvedValue({ id: 'w-1' }),
        },
        transaction: {
          create: jest.fn().mockResolvedValue({ id: 'tx-activation' }),
        },
      }),
    );

    await service.approve('app-1', 'manual:app-1');

    expect(ledger.post).toHaveBeenCalledWith({
      transactionId: 'tx-activation',
      entries: expect.any(Array),
    });
  });

  it('throws when approving non-pending application', async () => {
    (prisma.financingApplication.findUnique as jest.Mock).mockResolvedValue({
      id: 'app-1',
      status: 'APPROVED',
    });

    await expect(service.approve('app-1', 'manual:app-1')).rejects.toThrow('Application already decided');
  });

  it('rejects an application', async () => {
    (prisma.financingApplication.findUnique as jest.Mock).mockResolvedValue({
      id: 'app-1',
      customerId: 'c-1',
      status: 'PENDING',
    });
    (prisma.financingApplication.update as jest.Mock).mockResolvedValue({
      id: 'app-1',
      status: 'REJECTED',
    });

    const result = await service.reject('app-1', 'Risk policy');
    expect(result.status).toBe('REJECTED');
  });
});
