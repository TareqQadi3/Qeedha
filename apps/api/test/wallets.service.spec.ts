import { Test } from '@nestjs/testing';
import { WalletsService } from '../src/wallets/wallets.service';
import { FinancingApplicationService } from '../src/financing/services/financing-application.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { createMockPrisma } from './mocks/prisma.mock';

const mockFinancing = () => ({
  createApplication: jest.fn(),
});

describe('WalletsService', () => {
  let service: WalletsService;
  let prisma: ReturnType<typeof createMockPrisma>;
  let financing: ReturnType<typeof mockFinancing>;

  beforeEach(async () => {
    prisma = createMockPrisma();
    financing = mockFinancing();

    const module = await Test.createTestingModule({
      providers: [
        WalletsService,
        { provide: PrismaService, useValue: prisma },
        { provide: FinancingApplicationService, useValue: financing },
      ],
    }).compile();

    service = module.get<WalletsService>(WalletsService);
  });

  it('requests a wallet by creating a financing application', async () => {
    financing.createApplication.mockResolvedValue({ id: 'app-1', status: 'PENDING' });

    const result = await service.request('customer-1', {
      merchantId: 'merchant-1',
      amount: 1000,
      planType: 'PAY_IN_1',
    });

    expect(result.applicationId).toBe('app-1');
    expect(result.status).toBe('PENDING');
    expect(financing.createApplication).toHaveBeenCalledWith(
      'customer-1',
      'merchant-1',
      1000,
      'PAY_IN_1',
    );
  });

  it('lists wallets by customer', async () => {
    (prisma.wallet.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'w-1',
        customerId: 'c-1',
        merchantId: 'm-1',
        applicationId: 'a-1',
        totalAmount: 1000,
        remainingAmount: 500,
        status: 'ACTIVE',
        expiresAt: null,
      },
    ]);

    const result = await service.findByCustomer('c-1');
    expect(result).toHaveLength(1);
    expect(result[0].remainingAmount).toBe(500);
  });

  it('returns wallet by id when the requesting customer owns it', async () => {
    (prisma.wallet.findUnique as jest.Mock).mockResolvedValue({
      id: 'w-1',
      customerId: 'c-1',
      merchantId: 'm-1',
      applicationId: 'a-1',
      totalAmount: 1000,
      remainingAmount: 500,
      status: 'ACTIVE',
      expiresAt: null,
    });

    const result = await service.findById('w-1', 'c-1');
    expect(result.id).toBe('w-1');
  });

  it('throws when wallet not found', async () => {
    (prisma.wallet.findUnique as jest.Mock).mockResolvedValue(null);
    await expect(service.findById('missing', 'c-1')).rejects.toThrow('Wallet not found');
  });

  it('throws FORBIDDEN when the wallet belongs to a different customer', async () => {
    (prisma.wallet.findUnique as jest.Mock).mockResolvedValue({
      id: 'w-1',
      customerId: 'c-1',
      merchantId: 'm-1',
      applicationId: 'a-1',
      totalAmount: 1000,
      remainingAmount: 500,
      status: 'ACTIVE',
      expiresAt: null,
    });

    await expect(service.findById('w-1', 'someone-else')).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
  });

  it('returns balance when the requesting customer owns the wallet', async () => {
    (prisma.wallet.findUnique as jest.Mock).mockResolvedValue({
      id: 'w-1',
      customerId: 'c-1',
      totalAmount: 1000,
      remainingAmount: 300,
    });

    const balance = await service.getBalance('w-1', 'c-1');
    expect(balance.remainingAmount).toBe(300);
    expect(balance.currency).toBe('SAR');
  });

  it('throws FORBIDDEN for balance when the wallet belongs to a different customer', async () => {
    (prisma.wallet.findUnique as jest.Mock).mockResolvedValue({
      id: 'w-1',
      customerId: 'c-1',
      totalAmount: 1000,
      remainingAmount: 300,
    });

    await expect(service.getBalance('w-1', 'someone-else')).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
  });
});
