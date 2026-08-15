import { Injectable } from '@nestjs/common';
import { compareSync } from 'bcryptjs';
import { OtpPurpose } from '@prisma/client';
import { OtpService } from './otp.service';
import { TokenService } from './token.service';
import { PinService } from './pin.service';
import { NafathService } from './nafath.service';
import { PlatformStaffService } from '../../platform-staff/platform-staff.service';
import { PrismaService } from '../../prisma/prisma.service';
import { DomainException } from '../../common/exceptions/domain.exception';

@Injectable()
export class AuthService {
  constructor(
    private readonly otp: OtpService,
    private readonly tokens: TokenService,
    private readonly pin: PinService,
    private readonly nafath: NafathService,
    private readonly platformStaff: PlatformStaffService,
    private readonly prisma: PrismaService,
  ) {}

  async sendOtp(phone: string, purpose: OtpPurpose) {
    return this.otp.send(phone, purpose);
  }

  async verifyOtp(phone: string, purpose: OtpPurpose, code: string, fullName?: string) {
    await this.otp.verify(phone, purpose, code);

    let customer = await this.prisma.customer.findUnique({ where: { phone } });
    const isNewUser = !customer;

    if (isNewUser) {
      if (!fullName) {
        throw new DomainException('VALIDATION_ERROR', 'fullName is required for new users');
      }
      customer = await this.prisma.customer.create({
        data: { phone, fullName, status: 'PENDING_KYC' },
      });
    }

    const tokens = await this.tokens.generateCustomerTokens(customer!.id);
    return { ...tokens, isNewUser };
  }

  async refresh(refreshToken: string) {
    return this.tokens.refresh(refreshToken);
  }

  async logout(refreshToken: string) {
    await this.tokens.revoke(refreshToken);
  }

  async setCustomerPin(customerId: string, pin: string) {
    await this.pin.setCustomerPin(customerId, pin);
  }

  async verifyCustomerPin(customerId: string, pin: string) {
    await this.pin.verifyCustomerPin(customerId, pin);
  }

  async initiateNafath(customerId: string, nationalId: string) {
    return this.nafath.initiate(customerId, nationalId);
  }

  async loginPlatformStaff(email: string, password: string) {
    const staff = await this.platformStaff.findByEmail(email);
    if (!staff || staff.status !== 'ACTIVE') {
      throw new DomainException('UNAUTHORIZED', 'Invalid credentials');
    }
    const valid = await this.platformStaff.verifyPassword(staff.id, password);
    if (!valid) {
      throw new DomainException('UNAUTHORIZED', 'Invalid credentials');
    }
    const tokens = await this.tokens.generatePlatformStaffTokens(staff.id);
    return { ...tokens, role: staff.role };
  }

  async loginMerchantUser(merchantId: string, phone: string, password: string) {
    const user = await this.prisma.merchantUser.findFirst({
      where: { merchantId, phone },
    });
    if (!user || user.status !== 'ACTIVE') {
      throw new DomainException('UNAUTHORIZED', 'Invalid credentials');
    }
    const valid = compareSync(password, user.passwordHash);
    if (!valid) {
      throw new DomainException('UNAUTHORIZED', 'Invalid credentials');
    }
    const tokens = await this.tokens.generateMerchantUserTokens(user.id);
    return { ...tokens, role: user.role, merchantId: user.merchantId, userId: user.id };
  }
}
