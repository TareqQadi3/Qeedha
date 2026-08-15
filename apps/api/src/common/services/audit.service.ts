import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface AuditInput {
  actorId?: string;
  actorType: string;
  action: string;
  entity: string;
  entityId: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(input: AuditInput) {
    return this.prisma.auditLog.create({
      data: {
        actorId: input.actorId,
        actorType: input.actorType,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId,
        before: (input.before ?? {}) as Prisma.InputJsonValue,
        after: (input.after ?? {}) as Prisma.InputJsonValue,
        ip: input.ip,
        userAgent: input.userAgent,
      },
    });
  }
}
