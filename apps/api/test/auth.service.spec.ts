import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../src/auth/services/auth.service';
import { OtpService } from '../src/auth/services/otp.service';
import { TokenService } from '../src/auth/services/token.service';
import { PinService } from '../src/auth/services/pin.service';
import { NafathService } from '../src/auth/services/nafath.service';
import { PlatformStaffService } from '../src/platform-staff/platform-staff.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { NotificationsService } from '../src/notifications/notifications.service';
import { DomainException } from '../src/common/exceptions/domain.exception';
import { createMockPrisma } from './mocks/prisma.mock';

const mockOtp = () => ({
  send: jest.fn(),
  verify: jest.fn(),
});
const mockTokens = () => ({
  generateCustomerTokens: jest.fn(),
  refresh: jest.fn(),
  revoke: jest.fn(),
  generatePlatformStaffTokens: jest.fn(),
  generateMerchantUserTokens: jest.fn(),
});
const mockPin = () => ({
  setCustomerPin: jest.fn(),
  verifyCustomerPin: jest.fn(),
});
const mockNafath = () => ({
  initiate: jest.fn(),
  getStatus: jest.fn(),
  verify: jest.fn(),
});
const mockPlatformStaff = () => ({
  findByEmail: jest.fn(),
  verifyPassword: jest.fn(),
});
const mockNotifications = () => ({
  send: jest.fn(),
});

describe('AuthService.sendOtp', () => {
  let service: AuthService;
  let prisma: ReturnType<typeof createMockPrisma>;
  let otp: ReturnType<typeof mockOtp>;
  let notifications: ReturnType<typeof mockNotifications>;
  let config: { get: jest.Mock };

  const buildService = async (channel = 'EMAIL') => {
    prisma = createMockPrisma();
    otp = mockOtp();
    notifications = mockNotifications();
    config = {
      get: jest.fn((key: string, fallback?: unknown) =>
        key === 'AUTH_OTP_CHANNEL' ? channel : fallback,
      ),
    };

    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: OtpService, useValue: otp },
        { provide: TokenService, useValue: mockTokens() },
        { provide: PinService, useValue: mockPin() },
        { provide: NafathService, useValue: mockNafath() },
        { provide: PlatformStaffService, useValue: mockPlatformStaff() },
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationsService, useValue: notifications },
        { provide: ConfigService, useValue: config },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  };

  beforeEach(async () => {
    await buildService('EMAIL');
  });

  it('dispatches via NotificationsService with channel EMAIL using the explicit email param', async () => {
    otp.send.mockResolvedValue({ code: '123456', expiresInSeconds: 120 });
    (prisma.customer.findUnique as jest.Mock).mockResolvedValue(null);

    const result = await service.sendOtp(
      '+966500000000',
      'LOGIN',
      'user@example.com',
    );

    expect(result).toEqual({ code: '123456', expiresInSeconds: 120 });
    expect(notifications.send).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientType: 'customer',
        recipientId: '+966500000000',
        channel: 'EMAIL',
        template: 'otp_code',
        payload: expect.objectContaining({
          code: '123456',
          to: 'user@example.com',
        }) as unknown,
      }),
    );
  });

  it('stores/refreshes the customer email when a customer row exists with a different email', async () => {
    otp.send.mockResolvedValue({ code: '654321', expiresInSeconds: 120 });
    (prisma.customer.findUnique as jest.Mock).mockResolvedValue({
      id: 'cust-1',
      phone: '+966500000000',
      email: 'old@example.com',
    });
    (prisma.customer.update as jest.Mock).mockResolvedValue({});

    await service.sendOtp('+966500000000', 'LOGIN', 'new@example.com');

    expect(prisma.customer.update).toHaveBeenCalledWith({
      where: { id: 'cust-1' },
      data: { email: 'new@example.com' },
    });
    expect(notifications.send).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientId: 'cust-1',
        channel: 'EMAIL',
        payload: expect.objectContaining({ to: 'new@example.com' }) as unknown,
      }),
    );
  });

  it('falls back to the existing customer email when no email param is supplied', async () => {
    otp.send.mockResolvedValue({ code: '111111', expiresInSeconds: 120 });
    (prisma.customer.findUnique as jest.Mock).mockResolvedValue({
      id: 'cust-1',
      phone: '+966500000000',
      email: 'stored@example.com',
    });

    await service.sendOtp('+966500000000', 'LOGIN');

    expect(prisma.customer.update).not.toHaveBeenCalled();
    expect(notifications.send).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({
          to: 'stored@example.com',
        }) as unknown,
      }),
    );
  });

  it('throws VALIDATION_ERROR when channel is EMAIL and no email is available anywhere', async () => {
    otp.send.mockResolvedValue({ code: '222222', expiresInSeconds: 120 });
    (prisma.customer.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(service.sendOtp('+966500000001', 'LOGIN')).rejects.toThrow(
      DomainException,
    );
    expect(notifications.send).not.toHaveBeenCalled();
  });

  it('sends to phone via SMS without requiring email when channel is SMS', async () => {
    await buildService('SMS');
    otp.send.mockResolvedValue({ code: '333333', expiresInSeconds: 120 });
    (prisma.customer.findUnique as jest.Mock).mockResolvedValue(null);

    await service.sendOtp('+966500000002', 'LOGIN');

    expect(notifications.send).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientId: '+966500000002',
        channel: 'SMS',
        payload: expect.objectContaining({
          code: '333333',
          to: '+966500000002',
        }) as unknown,
      }),
    );
  });

  it('sends to phone via WHATSAPP without requiring email when channel is WHATSAPP', async () => {
    await buildService('WHATSAPP');
    otp.send.mockResolvedValue({ code: '444444', expiresInSeconds: 120 });
    (prisma.customer.findUnique as jest.Mock).mockResolvedValue(null);

    await service.sendOtp('+966500000003', 'LOGIN');

    expect(notifications.send).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientId: '+966500000003',
        channel: 'WHATSAPP',
        payload: expect.objectContaining({
          code: '444444',
          to: '+966500000003',
        }) as unknown,
      }),
    );
  });
});
