import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NafathService } from '../src/auth/services/nafath.service';

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

describe('NafathService', () => {
  let fetchMock: jest.Mock<
    Promise<FakeFetchResponse>,
    [string, FetchCallOptions]
  >;

  const buildConfig = (values: Record<string, string>) => ({
    get: jest.fn((key: string, fallback?: unknown) => values[key] ?? fallback),
  });

  const build = async (values: Record<string, string>) => {
    const module = await Test.createTestingModule({
      providers: [
        NafathService,
        { provide: ConfigService, useValue: buildConfig(values) },
      ],
    }).compile();
    return module.get<NafathService>(NafathService);
  };

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

  describe('NAFATH_ENABLED false (default)', () => {
    it('behaves exactly like the in-memory stub: initiate -> PENDING -> verify -> VERIFIED', async () => {
      const service = await build({});

      const init = await service.initiate('cust-1', '1234567890');
      expect(init.status).toBe('PENDING');
      expect(init.transactionId).toBe('nafath-cust-1-1234567890');

      const statusBefore = await service.getStatus(init.transactionId);
      expect(statusBefore.status).toBe('PENDING');
      expect(statusBefore.verifiedAt).toBeUndefined();

      await service.verify(init.transactionId);

      const statusAfter = await service.getStatus(init.transactionId);
      expect(statusAfter.status).toBe('VERIFIED');
      expect(statusAfter.verifiedAt).toBeInstanceOf(Date);

      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('unknown transaction ids default to PENDING', async () => {
      const service = await build({ NAFATH_ENABLED: 'false' });
      const status = await service.getStatus('unknown-tx');
      expect(status.status).toBe('PENDING');
    });
  });

  describe('NAFATH_ENABLED true', () => {
    it('initiate makes the expected fetch call and parses the response', async () => {
      fetchMock.mockResolvedValue(
        fakeResponse(true, 200, { transId: 'real-tx-1', random: '42' }),
      );

      const service = await build({
        NAFATH_ENABLED: 'true',
        NAFATH_API_URL: 'https://nafath.example.gov.sa',
        NAFATH_API_KEY: 'key-1',
        NAFATH_APP_ID: 'app-1',
      });

      const result = await service.initiate('cust-1', '1234567890');

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toBe('https://nafath.example.gov.sa/nafath/v1/requests');
      expect(options.headers['X-API-KEY']).toBe('key-1');
      expect(options.headers['APP-ID']).toBe('app-1');
      const body = JSON.parse(options.body) as Record<string, unknown>;
      expect(body.nationalId).toBe('1234567890');

      expect(result).toEqual({ transactionId: 'real-tx-1', status: 'PENDING' });
    });

    it('getStatus parses a mocked response into the correct shape', async () => {
      fetchMock
        .mockResolvedValueOnce(
          fakeResponse(true, 200, { transId: 'real-tx-2', random: '99' }),
        )
        .mockResolvedValueOnce(fakeResponse(true, 200, { status: 'VERIFIED' }));

      const service = await build({
        NAFATH_ENABLED: 'true',
        NAFATH_API_URL: 'https://nafath.example.gov.sa',
        NAFATH_API_KEY: 'key-1',
        NAFATH_APP_ID: 'app-1',
      });

      const init = await service.initiate('cust-1', '1234567890');
      const status = await service.getStatus(init.transactionId);

      expect(status.status).toBe('VERIFIED');
      expect(status.verifiedAt).toBeInstanceOf(Date);
      expect(fetchMock).toHaveBeenCalledTimes(2);
      const [url] = fetchMock.mock.calls[1];
      expect(url).toBe(
        'https://nafath.example.gov.sa/nafath/v1/requests/status',
      );
    });

    it('initiate throws when the response is not ok', async () => {
      fetchMock.mockResolvedValue(fakeResponse(false, 500, {}));

      const service = await build({
        NAFATH_ENABLED: 'true',
        NAFATH_API_URL: 'https://nafath.example.gov.sa',
        NAFATH_API_KEY: 'key-1',
        NAFATH_APP_ID: 'app-1',
      });

      await expect(service.initiate('cust-1', '1234567890')).rejects.toThrow();
    });
  });
});
