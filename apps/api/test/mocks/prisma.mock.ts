import { PrismaService } from '../src/prisma/prisma.service';

export function createMockPrisma(): jest.Mocked<PrismaService> {
  const mockModels = {
    customer: modelMock(),
    merchant: modelMock(),
    merchantUser: modelMock(),
    branch: modelMock(),
    financingProvider: modelMock(),
    financingApplication: modelMock(),
    wallet: modelMock(),
    transaction: modelMock(),
    ledgerEntry: modelMock(),
    settlement: modelMock(),
    paymentSchedule: modelMock(),
    otpCode: modelMock(),
    auditLog: modelMock(),
    notification: modelMock(),
    idempotencyKey: modelMock(),
    refreshToken: modelMock(),
    merchantApiCredential: modelMock(),
    externalCustomerMapping: modelMock(),
    webhookEndpoint: modelMock(),
    webhookDelivery: modelMock(),
  };

  const prisma = {
    ...mockModels,
    $transaction: jest.fn(async (cb) => cb(mockModels)),
    $connect: jest.fn(),
    $disconnect: jest.fn(),
  } as unknown as jest.Mocked<PrismaService>;

  return prisma;
}

function modelMock() {
  return {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    createMany: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    upsert: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
    count: jest.fn(),
  };
}
