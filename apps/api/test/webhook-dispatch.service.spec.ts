import { Test } from '@nestjs/testing';
import { createHmac } from 'crypto';
import { WebhookDispatchService } from '../src/integration/services/webhook-dispatch.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { EncryptionService } from '../src/common/services/encryption.service';
import { createMockPrisma } from './mocks/prisma.mock';

const mockEncryption = () => ({
  encrypt: jest.fn((v: string) => `enc:${v}`),
  decrypt: jest.fn((v: string) => v.replace('enc:', '')),
});

describe('WebhookDispatchService', () => {
  let service: WebhookDispatchService;
  let prisma: ReturnType<typeof createMockPrisma>;
  let encryption: ReturnType<typeof mockEncryption>;
  const originalFetch = global.fetch;

  beforeEach(async () => {
    prisma = createMockPrisma();
    encryption = mockEncryption();

    const module = await Test.createTestingModule({
      providers: [
        WebhookDispatchService,
        { provide: PrismaService, useValue: prisma },
        { provide: EncryptionService, useValue: encryption },
      ],
    }).compile();

    service = module.get<WebhookDispatchService>(WebhookDispatchService);
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('signs the payload with HMAC-SHA256 using the decrypted secret and records SENT on a 2xx response', async () => {
    (prisma.webhookEndpoint.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'ep-1',
        url: 'https://example.com/hook',
        secretEncrypted: 'enc:my-secret',
        isActive: true,
      },
    ]);
    (prisma.webhookDelivery.create as jest.Mock).mockResolvedValue({});

    const fetchMock = jest.fn().mockResolvedValue({ ok: true, status: 200 });
    global.fetch = fetchMock as any;

    const payload = { foo: 'bar' };
    await service.dispatch('merch-1', 'charge.succeeded', payload);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('https://example.com/hook');

    const expectedSignature = createHmac('sha256', 'my-secret')
      .update(JSON.stringify(payload))
      .digest('hex');
    expect(options.headers['X-Qeedha-Signature']).toBe(
      `sha256=${expectedSignature}`,
    );

    expect(prisma.webhookDelivery.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          endpointId: 'ep-1',
          status: 'SENT',
          responseStatus: 200,
        }),
      }),
    );
  });

  it('records FAILED on a non-2xx response', async () => {
    (prisma.webhookEndpoint.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'ep-1',
        url: 'https://example.com/hook',
        secretEncrypted: 'enc:my-secret',
        isActive: true,
      },
    ]);
    (prisma.webhookDelivery.create as jest.Mock).mockResolvedValue({});

    global.fetch = jest
      .fn()
      .mockResolvedValue({ ok: false, status: 500 }) as any;

    await service.dispatch('merch-1', 'charge.failed', { foo: 'bar' });

    expect(prisma.webhookDelivery.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          endpointId: 'ep-1',
          status: 'FAILED',
          responseStatus: 500,
        }),
      }),
    );
  });

  it('records FAILED on a network error and never throws', async () => {
    (prisma.webhookEndpoint.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'ep-1',
        url: 'https://example.com/hook',
        secretEncrypted: 'enc:my-secret',
        isActive: true,
      },
    ]);
    (prisma.webhookDelivery.create as jest.Mock).mockResolvedValue({});

    global.fetch = jest
      .fn()
      .mockRejectedValue(new Error('network down')) as any;

    await expect(
      service.dispatch('merch-1', 'charge.succeeded', { foo: 'bar' }),
    ).resolves.toBeUndefined();

    expect(prisma.webhookDelivery.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ endpointId: 'ep-1', status: 'FAILED' }),
      }),
    );
  });

  it('never throws even if looking up endpoints fails', async () => {
    (prisma.webhookEndpoint.findMany as jest.Mock).mockRejectedValue(
      new Error('db down'),
    );

    await expect(
      service.dispatch('merch-1', 'charge.succeeded', { foo: 'bar' }),
    ).resolves.toBeUndefined();
  });
});
