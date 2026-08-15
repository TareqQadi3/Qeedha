import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { MerchantUserRole } from '@prisma/client';
import { DomainException } from '../../common/exceptions/domain.exception';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<MerchantUserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as { userId: string; type: string } | undefined;
    if (!user || user.type !== 'merchant_user') {
      throw new DomainException('FORBIDDEN', 'Merchant user access required');
    }

    const merchantUser = await this.prisma.merchantUser.findUnique({
      where: { id: user.userId },
      select: { role: true },
    });

    if (!merchantUser || !requiredRoles.includes(merchantUser.role)) {
      throw new DomainException('FORBIDDEN', 'Insufficient role');
    }

    return true;
  }
}
