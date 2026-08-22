import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { UnifonicAdapter } from '../src/notifications/adapters/unifonic.adapter';

interface FakeFetchResponse {
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
}

interface FetchCallOptions {
  method: string;
  headers: Record<string, string>;
  body: string;
}

const fakeResponse = (
  ok: boolean,
  status: number,
  body: unknown,
): FakeFetchResponse => ({
  ok,
  status,
  json: () => Promise.resolve(body),
});

describe('UnifonicAdapter', () => {
  let adapter: UnifonicAdapter;
  let config: { get: jest.Mock };
  let fetchMock: jest.Mock<
    Promise<FakeFetchResponse>,
    [string, FetchCallOptions]
  >;

  const buildConfig = (values: Record<string, string>) => ({
    get: jest.fn((key: string, fallback?: unknown) => values[key] ?? fallback),
  });

  beforeEach(() => {
    fetchMock = jest.fn<
      Promise<FakeFetchResponse>,
      [string, FetchCallOptions]
    >();
    (global as unknown as { fetch: typeof fetchMock }).fetch = fetchMock;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const build = async (values: Record<string, string>) => {
    config = buildConfig(values);
    const module = await Test.createTestingModule({
      providers: [
        UnifonicAdapter,
        { provide: ConfigService, useValue: config },
      ],
    }).compile();
    adapter = module.get<UnifonicAdapter>(UnifonicAdapter);
  };

  describe('when UNIFONIC_API_KEY is not configured', () => {
    beforeEach(async () => {
      await build({
        UNIFONIC_API_URL: 'https://api.unifonic.com',
        UNIFONIC_API_KEY: '',
      });
    });

    it('sendSms returns a safe failure without calling fetch', async () => {
      const result = await adapter.sendSms('+966500000000', 'hello');
      expect(result).toEqual({ success: false, providerRef: null });
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('sendWhatsApp returns a safe failure without calling fetch', async () => {
      const result = await adapter.sendWhatsApp('+966500000000', {
        code: '123456',
      });
      expect(result).toEqual({ success: false, providerRef: null });
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('sendEmail returns a safe failure without calling fetch', async () => {
      const result = await adapter.sendEmail(
        'user@example.com',
        'subject',
        'body',
      );
      expect(result).toEqual({ success: false, providerRef: null });
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe('when configured', () => {
    beforeEach(async () => {
      await build({
        UNIFONIC_API_URL: 'https://api.unifonic.com',
        UNIFONIC_API_KEY: 'test-key',
        UNIFONIC_SENDER_ID: 'Qeedha',
        UNIFONIC_EMAIL_FROM: 'noreply@qeedha.sa',
        UNIFONIC_WHATSAPP_TEMPLATE: 'otp_template',
      });
    });

    it('sendSms posts to the SMS endpoint with the correct headers and body', async () => {
      fetchMock.mockResolvedValue(
        fakeResponse(true, 200, { MessageID: 'msg-1' }),
      );

      const result = await adapter.sendSms(
        '+966500000000',
        'your code is 123456',
      );

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toBe('https://api.unifonic.com/rest/SMS/messages');
      expect(options.method).toBe('POST');
      expect(options.headers.Authorization).toBe('Bearer test-key');
      expect(options.headers['Content-Type']).toBe('application/json');
      const body = JSON.parse(options.body) as Record<string, unknown>;
      expect(body.Recipient).toBe('+966500000000');
      expect(body.Body).toBe('your code is 123456');
      expect(body.SenderID).toBe('Qeedha');
      expect(result).toEqual({ success: true, providerRef: 'msg-1' });
    });

    it('sendWhatsApp posts to the WhatsApp endpoint with the template name', async () => {
      fetchMock.mockResolvedValue(
        fakeResponse(true, 200, { MessageID: 'msg-2' }),
      );

      const result = await adapter.sendWhatsApp('+966500000000', {
        code: '123456',
      });

      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toBe('https://api.unifonic.com/rest/WhatsApp/messages');
      const body = JSON.parse(options.body) as Record<string, unknown>;
      expect(body.TemplateName).toBe('otp_template');
      expect(body.TemplateData).toEqual({ code: '123456' });
      expect(result).toEqual({ success: true, providerRef: 'msg-2' });
    });

    it('sendEmail posts to the Email endpoint with the from address', async () => {
      fetchMock.mockResolvedValue(
        fakeResponse(true, 200, { MessageID: 'msg-3' }),
      );

      const result = await adapter.sendEmail(
        'user@example.com',
        'Your code',
        'Body text',
      );

      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toBe('https://api.unifonic.com/rest/Email/messages');
      const body = JSON.parse(options.body) as Record<string, unknown>;
      expect(body.From).toBe('noreply@qeedha.sa');
      expect(body.Subject).toBe('Your code');
      expect(body.Recipient).toBe('user@example.com');
      expect(result).toEqual({ success: true, providerRef: 'msg-3' });
    });

    it('returns a safe failure without throwing on a non-2xx response', async () => {
      fetchMock.mockResolvedValue(fakeResponse(false, 500, {}));

      const result = await adapter.sendSms('+966500000000', 'hi');
      expect(result).toEqual({ success: false, providerRef: null });
    });

    it('returns a safe failure without throwing when fetch rejects', async () => {
      fetchMock.mockRejectedValue(new Error('network down'));

      const result = await adapter.sendSms('+966500000000', 'hi');
      expect(result).toEqual({ success: false, providerRef: null });
    });
  });
});
