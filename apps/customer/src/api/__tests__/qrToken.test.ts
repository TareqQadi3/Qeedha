jest.mock('../../storage/secureStorage', () => ({
  getAccessToken: jest.fn().mockResolvedValue('token-abc'),
  getTokens: jest.fn(),
  setTokens: jest.fn(),
  clearTokens: jest.fn(),
}));

import { getMyQrCode } from '../customer';

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

describe('QR payment token contract', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('hands the renderer exactly `${customerId}:${code}` as returned by the backend', async () => {
    const customerId = '3f5b1e2a-1111-4a2b-9c3d-abcdef123456';
    const code = '482913';
    const fetchMock = jest
      .fn()
      .mockResolvedValue(jsonResponse(200, { token: `${customerId}:${code}`, expiresInSeconds: 60 }));
    global.fetch = fetchMock as unknown as typeof fetch;

    const response = await getMyQrCode();

    // This is the exact contract transactions.service.ts's previewPaymentToken relies on
    // (it does `dto.token.split(':')`) — get this wrong and cashier scans silently fail.
    expect(response.token).toBe(`${customerId}:${code}`);
    expect(response.token.split(':')).toEqual([customerId, code]);
    expect(response.expiresInSeconds).toBe(60);
  });
});
