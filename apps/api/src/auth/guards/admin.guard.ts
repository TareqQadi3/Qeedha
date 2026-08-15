import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PlatformStaffRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ADMIN_ROLES_KEY } from '../decorators/admin-roles.decorator';
import { DomainException } from '../../common/exceptions/domain.exception';

export interface AdminRequestUser {
  userId: string;
  type: 'platform_staff';
}

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<PlatformStaffRole[]>(ADMIN_ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as { userId: string; type: string } | undefined;
    if (!user || user.type !== 'platform_staff') {
      throw new DomainException('FORBIDDEN', 'Platform staff access required');
    }

    const staff = await this.prisma.platformStaff.findUnique({
      where: { id: user.userId },
      select: { role: true, status: true },
    });

    if (!staff || staff.status !== 'ACTIVE') {
      throw new DomainException('FORBIDDEN', 'Inactive or unknown staff account');
    }

    if (!requiredRoles.includes(staff.role)) {
      throw new DomainException('FORBIDDEN', 'Insufficient admin role');
    }

    request.admin = staff;
    return true;
  }
}
