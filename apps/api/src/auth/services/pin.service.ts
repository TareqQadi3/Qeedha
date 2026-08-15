import { Injectable } from '@nestjs/common';
import { compareSync, hashSync } from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import { DomainException } from '../../common/exceptions/domain.exception';

@Injectable()
export class PinService {
  constructor(private readonly prisma: PrismaService) {}

  async setCustomerPin(customerId: string, pin: string): Promise<void> {
    await this.prisma.customer.update({
      where: { id: customerId },
      data: { pinHash: hashSync(pin, 10) },
    });
  }

  async verifyCustomerPin(customerId: string, pin: string): Promise<void> {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      select: { pinHash: true },
    });
    if (!customer?.pinHash || !compareSync(pin, customer.pinHash)) {
      throw new DomainException('UNAUTHORIZED', 'Invalid PIN');
    }
  }

  async setMerchantUserPin(userId: string, pin: string): Promise<void> {
    await this.prisma.merchantUser.update({
      where: { id: userId },
      data: { pinHash: hashSync(pin, 10) },
    });
  }

  async verifyMerchantUserPin(userId: string, pin: string): Promise<void> {
    const user = await this.prisma.merchantUser.findUnique({
      where: { id: userId },
      select: { pinHash: true },
    });
    if (!user?.pinHash || !compareSync(pin, user.pinHash)) {
      throw new DomainException('UNAUTHORIZED', 'Invalid PIN');
    }
  }
}
