import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api, ApiError, clearAuth, getToken, setAuth, setUnauthorizedHandler } from '../api';

function mockFetch(response: { ok: boolean; status: number; body?: unknown }) {
  return vi.fn().mockResolvedValue({
    ok: response.ok,
    status: response.status,
    text: async () => (response.body === undefined ? '' : JSON.stringify(response.body)),
  });
}

describe('api client', () => {
  beforeEach(() => {
    clearAuth();
    setUnauthorizedHandler(null);
    vi.restoreAllMocks();
  });

  it('prefixes every request with /v1 and attaches the bearer token when present', async () => {
    setAuth('tok-123', 'SUPER_ADMIN', 'admin@qeedha.sa');
    const fetchMock = mockFetch({ ok: true, status: 200, body: { hello: 'world' } });
    vi.stubGlobal('fetch', fetchMock);

    const result = await api('/admin/merchants');

    expect(fetchMock).toHaveBeenCalledWith(
      '/v1/admin/merchants',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer tok-123' }),
      }),
    );
    expect(result).toEqual({ hello: 'world' });
  });

  it('does not attach an Authorization header when there is no token', async () => {
    const fetchMock = mockFetch({ ok: true, status: 200, body: {} });
    vi.stubGlobal('fetch', fetchMock);

    await api('/auth/admin/login', { method: 'POST', body: '{}' });

    const [, requestInit] = fetchMock.mock.calls[0];
    expect((requestInit.headers as Record<string, string>).Authorization).toBeUndefined();
  });

  it('parses the { message, code } error contract and throws an ApiError', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch({
        ok: false,
        status: 409,
        body: { statusCode: 409, message: 'Merchant already exists', code: 'CONFLICT' },
      }),
    );

    await expect(api('/admin/merchants')).rejects.toMatchObject({
      message: 'Merchant already exists',
      code: 'CONFLICT',
      status: 409,
    });
  });

  it('falls back to a generic message/ERROR code when the error body has none', async () => {
    vi.stubGlobal('fetch', mockFetch({ ok: false, status: 500 }));

    await expect(api('/admin/applications')).rejects.toMatchObject({
      code: 'ERROR',
      status: 500,
    });
  });

  it('clears stored auth and notifies the unauthorized handler on a 401', async () => {
    setAuth('tok-456', 'FINANCE', 'finance@qeedha.sa');
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    vi.stubGlobal(
      'fetch',
      mockFetch({ ok: false, status: 401, body: { message: 'Unauthorized', code: 'UNAUTHORIZED' } }),
    );

    await expect(api('/admin/applications')).rejects.toBeInstanceOf(ApiError);

    expect(getToken()).toBeNull();
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('leaves stored auth untouched and does not notify the handler on non-401 errors', async () => {
    setAuth('tok-789', 'FINANCE', 'finance@qeedha.sa');
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    vi.stubGlobal(
      'fetch',
      mockFetch({ ok: false, status: 403, body: { message: 'Forbidden', code: 'FORBIDDEN' } }),
    );

    await expect(api('/admin/applications')).rejects.toBeInstanceOf(ApiError);

    expect(getToken()).toBe('tok-789');
    expect(handler).not.toHaveBeenCalled();
  });
});
