import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { compareSync } from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import { DomainException } from '../../common/exceptions/domain.exception';

@Injectable()
export class ApiCredentialGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'];
    const apiSecret = request.headers['x-api-secret'];

    if (!apiKey || !apiSecret) {
      throw new DomainException(
        'UNAUTHORIZED',
        'X-Api-Key and X-Api-Secret headers are required',
      );
    }

    const credential = await this.prisma.merchantApiCredential.findUnique({
      where: { apiKey },
    });

    if (!credential || credential.status !== 'ACTIVE') {
      throw new DomainException(
        'UNAUTHORIZED',
        'Invalid or revoked API credential',
      );
    }

    const valid = compareSync(apiSecret, credential.apiSecretHash);
    if (!valid) {
      throw new DomainException('UNAUTHORIZED', 'Invalid API credential');
    }

    const merchant = await this.prisma.merchant.findUnique({
      where: { id: credential.merchantId },
    });

    if (!merchant || merchant.deletedAt || merchant.status !== 'ACTIVE') {
      throw new DomainException('FORBIDDEN', 'Merchant is not active');
    }

    request.merchantContext = { merchantId: credential.merchantId };
    return true;
  }
}
