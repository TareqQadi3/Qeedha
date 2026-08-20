import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CustomersController } from '../src/customers/customers.controller';
import { CustomersService } from '../src/customers/customers.service';
import { NafathService } from '../src/auth/services/nafath.service';
import { QrService } from '../src/auth/services/qr.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { createMockPrisma } from './mocks/prisma.mock';

const mockCustomers = () => ({
  getMe: jest.fn(),
  updateMe: jest.fn(),
});
const mockNafath = () => ({
  initiate: jest.fn(),
});
const mockQr = () => ({
  generate: jest.fn(),
});

describe('CustomersController - qr-code', () => {
  let controller: CustomersController;
  let prisma: ReturnType<typeof createMockPrisma>;
  let customers: ReturnType<typeof mockCustomers>;
  let nafath: ReturnType<typeof mockNafath>;
  let qr: ReturnType<typeof mockQr>;
  let config: { get: jest.Mock };

  beforeEach(async () => {
    prisma = createMockPrisma();
    customers = mockCustomers();
    nafath = mockNafath();
    qr = mockQr();
    config = { get: jest.fn((_key: string, fallback?: unknown) => fallback) };

    const module = await Test.createTestingModule({
      controllers: [CustomersController],
      providers: [
        { provide: CustomersService, useValue: customers },
        { provide: NafathService, useValue: nafath },
        { provide: QrService, useValue: qr },
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: config },
      ],
    }).compile();

    controller = module.get<CustomersController>(CustomersController);
  });

  it('returns the customerId:code token and default expiry', async () => {
    qr.generate.mockReturnValue('123456');

    const result = await controller.getQrCode({ userId: 'customer-1' });

    expect(qr.generate).toHaveBeenCalledWith('customer-1');
    expect(result).toEqual({ token: 'customer-1:123456', expiresInSeconds: 60 });
  });

  it('uses QR_EXPIRES_IN_SECONDS from config when set', async () => {
    qr.generate.mockReturnValue('654321');
    config.get.mockImplementation((key: string, fallback?: unknown) =>
      key === 'QR_EXPIRES_IN_SECONDS' ? 90 : fallback,
    );

    const result = await controller.getQrCode({ userId: 'customer-2' });

    expect(result).toEqual({ token: 'customer-2:654321', expiresInSeconds: 90 });
  });
});
