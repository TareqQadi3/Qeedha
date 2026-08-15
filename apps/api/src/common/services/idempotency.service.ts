import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class IdempotencyService {
  constructor(private readonly prisma: PrismaService) {}

  async getExisting<T>(
    key: string,
    resourceType: string,
  ): Promise<{ response: T | null; requestHash: string } | null> {
    const record = await this.prisma.idempotencyKey.findUnique({
      where: { key },
    });
    if (!record || record.expiresAt < new Date()) return null;
    if (record.resourceType !== resourceType) return null;
    return {
      response: (record.responseBody as T) ?? null,
      requestHash: record.requestHash ?? '',
    };
  }

  async store<T>(
    key: string,
    resourceType: string,
    resourceId: string,
    requestHash: string,
    responseBody: T,
    ttlSeconds: number,
  ) {
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
    const body = responseBody as unknown as Prisma.InputJsonValue;
    await this.prisma.idempotencyKey.upsert({
      where: { key },
      create: {
        key,
        resourceType,
        resourceId,
        requestHash,
        responseBody: body,
        expiresAt,
      },
      update: {
        resourceType,
        resourceId,
        requestHash,
        responseBody: body,
        expiresAt,
      },
    });
  }

  async cleanup() {
    return this.prisma.idempotencyKey.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
  }
}
