import { Test } from '@nestjs/testing';
import { NotificationsService } from '../src/notifications/notifications.service';
import { UnifonicAdapter } from '../src/notifications/adapters/unifonic.adapter';
import { PrismaService } from '../src/prisma/prisma.service';
import { createMockPrisma } from './mocks/prisma.mock';

const mockUnifonic = () => ({
  sendSms: jest.fn(),
  sendWhatsApp: jest.fn(),
  sendEmail: jest.fn(),
});

describe('NotificationsService', () => {
  let service: NotificationsService;
  let prisma: ReturnType<typeof createMockPrisma>;
  let unifonic: ReturnType<typeof mockUnifonic>;

  beforeEach(async () => {
    prisma = createMockPrisma();
    unifonic = mockUnifonic();

    const module = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: prisma },
        { provide: UnifonicAdapter, useValue: unifonic },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  it('persists PENDING then updates to SENT on adapter success', async () => {
    (prisma.notification.create as jest.Mock).mockResolvedValue({
      id: 'notif-1',
    });
    (prisma.notification.update as jest.Mock).mockResolvedValue({});
    unifonic.sendEmail.mockResolvedValue({
      success: true,
      providerRef: 'ref-1',
    });

    await service.send({
      recipientType: 'customer',
      recipientId: 'cust-1',
      channel: 'EMAIL',
      template: 'otp_code',
      payload: { code: '123456', to: 'user@example.com' },
    });

    expect(prisma.notification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        recipientType: 'customer',
        recipientId: 'cust-1',
        channel: 'EMAIL',
        template: 'otp_code',
        status: 'PENDING',
      }) as unknown,
    });
    expect(unifonic.sendEmail).toHaveBeenCalledWith(
      'user@example.com',
      'otp_code',
      expect.any(String),
    );
    expect(prisma.notification.update).toHaveBeenCalledWith({
      where: { id: 'notif-1' },
      data: expect.objectContaining({
        status: 'SENT',
        providerRef: 'ref-1',
      }) as unknown,
    });
  });

  it('persists PENDING then updates to FAILED on adapter failure', async () => {
    (prisma.notification.create as jest.Mock).mockResolvedValue({
      id: 'notif-2',
    });
    (prisma.notification.update as jest.Mock).mockResolvedValue({});
    unifonic.sendSms.mockResolvedValue({ success: false, providerRef: null });

    await service.send({
      recipientType: 'customer',
      recipientId: '+966500000000',
      channel: 'SMS',
      template: 'otp_code',
      payload: { code: '123456', to: '+966500000000' },
    });

    expect(prisma.notification.update).toHaveBeenCalledWith({
      where: { id: 'notif-2' },
      data: expect.objectContaining({
        status: 'FAILED',
        providerRef: null,
        sentAt: null,
      }) as unknown,
    });
  });

  it('never throws when the adapter itself throws', async () => {
    (prisma.notification.create as jest.Mock).mockResolvedValue({
      id: 'notif-3',
    });
    (prisma.notification.update as jest.Mock).mockResolvedValue({});
    unifonic.sendSms.mockRejectedValue(new Error('boom'));

    await expect(
      service.send({
        recipientType: 'customer',
        recipientId: '+966500000000',
        channel: 'SMS',
        template: 'otp_code',
        payload: { code: '123456' },
      }),
    ).resolves.toBeUndefined();

    expect(prisma.notification.update).toHaveBeenCalledWith({
      where: { id: 'notif-3' },
      data: expect.objectContaining({ status: 'FAILED' }) as unknown,
    });
  });

  it('never throws when persisting the notification row fails', async () => {
    (prisma.notification.create as jest.Mock).mockRejectedValue(
      new Error('db down'),
    );
    unifonic.sendSms.mockResolvedValue({ success: true, providerRef: 'ref-x' });

    await expect(
      service.send({
        recipientType: 'customer',
        recipientId: '+966500000000',
        channel: 'SMS',
        template: 'otp_code',
        payload: { code: '123456' },
      }),
    ).resolves.toBeUndefined();

    expect(prisma.notification.update).not.toHaveBeenCalled();
  });

  it('records a FAILED result for PUSH (no active provider yet) without throwing', async () => {
    (prisma.notification.create as jest.Mock).mockResolvedValue({
      id: 'notif-4',
    });
    (prisma.notification.update as jest.Mock).mockResolvedValue({});

    await service.send({
      recipientType: 'customer',
      recipientId: 'cust-1',
      channel: 'PUSH',
      template: 'purchase_completed',
      payload: { amount: 100 },
    });

    expect(prisma.notification.update).toHaveBeenCalledWith({
      where: { id: 'notif-4' },
      data: expect.objectContaining({ status: 'FAILED' }) as unknown,
    });
  });
});
