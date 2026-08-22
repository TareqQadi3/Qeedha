import { Test } from '@nestjs/testing';
import { createHmac } from 'crypto';
import { WebhookDispatchService } from '../src/integration/services/webhook-dispatch.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { EncryptionService } from '../src/common/services/encryption.service';
import { createMockPrisma } from './mocks/prisma.mock';
import * as ssrfGuard from '../src/integration/utils/ssrf-guard';

jest.mock('../src/integration/utils/ssrf-guard', () => ({
  ...jest.requireActual('../src/integration/utils/ssrf-guard'),
  safeWebhookPost: jest.fn(),
}));

const mockEncryption = () => ({
  encrypt: jest.fn((v: string) => `enc:${v}`),
  decrypt: jest.fn((v: string) => v.replace('enc:', '')),
});

const safeWebhookPostMock = ssrfGuard.safeWebhookPost as jest.Mock;

describe('WebhookDispatchService', () => {
  let service: WebhookDispatchService;
  let prisma: ReturnType<typeof createMockPrisma>;
  let encryption: ReturnType<typeof mockEncryption>;

  beforeEach(async () => {
    prisma = createMockPrisma();
    encryption = mockEncryption();
    safeWebhookPostMock.mockReset();

    const module = await Test.createTestingModule({
      providers: [
        WebhookDispatchService,
        { provide: PrismaService, useValue: prisma },
        { provide: EncryptionService, useValue: encryption },
      ],
    }).compile();

    service = module.get<WebhookDispatchService>(WebhookDispatchService);
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
    safeWebhookPostMock.mockResolvedValue({ status: 200 });

    const payload = { foo: 'bar' };
    await service.dispatch('merch-1', 'charge.succeeded', payload);

    expect(safeWebhookPostMock).toHaveBeenCalledTimes(1);
    const [url, body, headers, timeoutMs] = safeWebhookPostMock.mock.calls[0];
    expect(url).toBe('https://example.com/hook');
    expect(timeoutMs).toBe(5000);

    const expectedSignature = createHmac('sha256', 'my-secret')
      .update(body)
      .digest('hex');
    expect(headers['X-Qeedha-Signature']).toBe(`sha256=${expectedSignature}`);

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
    safeWebhookPostMock.mockResolvedValue({ status: 500 });

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
    safeWebhookPostMock.mockRejectedValue(new Error('network down'));

    await expect(
      service.dispatch('merch-1', 'charge.succeeded', { foo: 'bar' }),
    ).resolves.toBeUndefined();

    expect(prisma.webhookDelivery.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ endpointId: 'ep-1', status: 'FAILED' }),
      }),
    );
  });

  it('records FAILED (without ever calling safeWebhookPost) when the URL resolves to a blocked address', async () => {
    (prisma.webhookEndpoint.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'ep-1',
        url: 'http://169.254.169.254/latest/meta-data/',
        secretEncrypted: 'enc:my-secret',
        isActive: true,
      },
    ]);
    (prisma.webhookDelivery.create as jest.Mock).mockResolvedValue({});
    safeWebhookPostMock.mockRejectedValue(
      new ssrfGuard.UnsafeWebhookUrlError('blocked'),
    );

    await service.dispatch('merch-1', 'charge.succeeded', { foo: 'bar' });

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
