jest.mock('../../storage/secureStorage', () => ({
  getAccessToken: jest.fn(),
  getTokens: jest.fn(),
  setTokens: jest.fn(),
  clearTokens: jest.fn(),
}));

import * as secureStorage from '../../storage/secureStorage';
import { api, ApiError, setUnauthorizedHandler } from '../client';

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

describe('api client', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.resetAllMocks();
    setUnauthorizedHandler(null);
    process.env.EXPO_PUBLIC_API_URL = 'http://localhost:3001/v1';
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('attaches the Authorization header when an access token exists', async () => {
    (secureStorage.getAccessToken as jest.Mock).mockResolvedValue('token-abc');
    const fetchMock = jest.fn().mockResolvedValue(jsonResponse(200, { ok: true }));
    global.fetch = fetchMock as unknown as typeof fetch;

    await api('/customers/me');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers.Authorization).toBe('Bearer token-abc');
  });

  it('does not attach an Authorization header when there is no token', async () => {
    (secureStorage.getAccessToken as jest.Mock).mockResolvedValue(null);
    const fetchMock = jest.fn().mockResolvedValue(jsonResponse(200, { ok: true }));
    global.fetch = fetchMock as unknown as typeof fetch;

    await api('/auth/otp/send', { skipAuth: true });

    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers.Authorization).toBeUndefined();
  });

  it('throws a typed ApiError with code/status on a non-2xx response', async () => {
    (secureStorage.getAccessToken as jest.Mock).mockResolvedValue('token-abc');
    const fetchMock = jest
      .fn()
      .mockResolvedValue(jsonResponse(400, { message: 'Invalid phone', code: 'VALIDATION_ERROR' }));
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(api('/auth/otp/send')).rejects.toMatchObject({
      message: 'Invalid phone',
      code: 'VALIDATION_ERROR',
      status: 400,
    });
    await expect(api('/auth/otp/send')).rejects.toBeInstanceOf(ApiError);
  });

  it('performs exactly one silent refresh-and-retry on a 401, then returns the retried result', async () => {
    (secureStorage.getAccessToken as jest.Mock)
      .mockResolvedValueOnce('expired-token')
      .mockResolvedValueOnce('fresh-token');
    (secureStorage.getTokens as jest.Mock).mockResolvedValue({
      accessToken: 'expired-token',
      refreshToken: 'refresh-1',
    });
    (secureStorage.setTokens as jest.Mock).mockResolvedValue(undefined);

    const fetchMock = jest
      .fn()
      // 1. original request -> 401
      .mockResolvedValueOnce(jsonResponse(401, { message: 'Unauthorized', code: 'UNAUTHORIZED' }))
      // 2. POST /auth/refresh -> success
      .mockResolvedValueOnce(
        jsonResponse(200, { accessToken: 'fresh-token', refreshToken: 'refresh-2', expiresIn: 900 }),
      )
      // 3. retried original request -> 200
      .mockResolvedValueOnce(jsonResponse(200, { id: 'wallet-1' }));
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await api('/wallets/wallet-1');

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[1][0]).toContain('/auth/refresh');
    expect(result).toEqual({ id: 'wallet-1' });
    expect(secureStorage.setTokens).toHaveBeenCalledWith({
      accessToken: 'fresh-token',
      refreshToken: 'refresh-2',
    });
  });

  it('gives up and clears tokens when the refresh itself fails', async () => {
    (secureStorage.getAccessToken as jest.Mock).mockResolvedValue('expired-token');
    (secureStorage.getTokens as jest.Mock).mockResolvedValue({
      accessToken: 'expired-token',
      refreshToken: 'refresh-1',
    });
    (secureStorage.clearTokens as jest.Mock).mockResolvedValue(undefined);

    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse(401, { message: 'Unauthorized', code: 'UNAUTHORIZED' }))
      .mockResolvedValueOnce(jsonResponse(401, { message: 'Invalid refresh token', code: 'UNAUTHORIZED' }));
    global.fetch = fetchMock as unknown as typeof fetch;

    const onUnauthorized = jest.fn();
    setUnauthorizedHandler(onUnauthorized);

    await expect(api('/wallets/wallet-1')).rejects.toMatchObject({ status: 401 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(secureStorage.clearTokens).toHaveBeenCalled();
    expect(onUnauthorized).toHaveBeenCalled();
  });
});
