import { ExecutionContext } from '@nestjs/common';
import { hashSync } from 'bcryptjs';
import { ApiCredentialGuard } from '../src/integration/guards/api-credential.guard';
import { createMockPrisma } from './mocks/prisma.mock';

function contextWithHeaders(headers: Record<string, string>): ExecutionContext {
  const request: any = { headers };
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext;
}

describe('ApiCredentialGuard', () => {
  let prisma: ReturnType<typeof createMockPrisma>;
  let guard: ApiCredentialGuard;

  const secretHash = hashSync('correct-secret', 10);

  beforeEach(() => {
    prisma = createMockPrisma();
    guard = new ApiCredentialGuard(prisma);
  });

  it('passes with a valid key and secret against an active merchant', async () => {
    (prisma.merchantApiCredential.findUnique as jest.Mock).mockResolvedValue({
      merchantId: 'merch-1',
      apiSecretHash: secretHash,
      status: 'ACTIVE',
    });
    (prisma.merchant.findUnique as jest.Mock).mockResolvedValue({
      id: 'merch-1',
      status: 'ACTIVE',
      deletedAt: null,
    });

    const ctx = contextWithHeaders({
      'x-api-key': 'qk_live_abc',
      'x-api-secret': 'correct-secret',
    });
    const result = await guard.canActivate(ctx);

    expect(result).toBe(true);
    const request = ctx.switchToHttp().getRequest();
    expect(request.merchantContext).toEqual({ merchantId: 'merch-1' });
  });

  it('rejects a wrong secret', async () => {
    (prisma.merchantApiCredential.findUnique as jest.Mock).mockResolvedValue({
      merchantId: 'merch-1',
      apiSecretHash: secretHash,
      status: 'ACTIVE',
    });

    const ctx = contextWithHeaders({
      'x-api-key': 'qk_live_abc',
      'x-api-secret': 'wrong-secret',
    });

    await expect(guard.canActivate(ctx)).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
    });
  });

  it('rejects a revoked credential', async () => {
    (prisma.merchantApiCredential.findUnique as jest.Mock).mockResolvedValue({
      merchantId: 'merch-1',
      apiSecretHash: secretHash,
      status: 'REVOKED',
    });

    const ctx = contextWithHeaders({
      'x-api-key': 'qk_live_abc',
      'x-api-secret': 'correct-secret',
    });

    await expect(guard.canActivate(ctx)).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
    });
  });

  it('rejects when the merchant is not active', async () => {
    (prisma.merchantApiCredential.findUnique as jest.Mock).mockResolvedValue({
      merchantId: 'merch-1',
      apiSecretHash: secretHash,
      status: 'ACTIVE',
    });
    (prisma.merchant.findUnique as jest.Mock).mockResolvedValue({
      id: 'merch-1',
      status: 'SUSPENDED',
      deletedAt: null,
    });

    const ctx = contextWithHeaders({
      'x-api-key': 'qk_live_abc',
      'x-api-secret': 'correct-secret',
    });

    await expect(guard.canActivate(ctx)).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
  });

  it('rejects missing headers', async () => {
    const ctx = contextWithHeaders({});
    await expect(guard.canActivate(ctx)).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
    });
  });
});
