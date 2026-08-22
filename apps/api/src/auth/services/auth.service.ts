import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { compareSync } from 'bcryptjs';
import { OtpPurpose } from '@prisma/client';
import { OtpService } from './otp.service';
import { TokenService } from './token.service';
import { PinService } from './pin.service';
import { NafathService } from './nafath.service';
import { PlatformStaffService } from '../../platform-staff/platform-staff.service';
import { PrismaService } from '../../prisma/prisma.service';
import { DomainException } from '../../common/exceptions/domain.exception';
import { NotificationsService } from '../../notifications/notifications.service';

type OtpChannel = 'EMAIL' | 'SMS' | 'WHATSAPP';

@Injectable()
export class AuthService {
  constructor(
    private readonly otp: OtpService,
    private readonly tokens: TokenService,
    private readonly pin: PinService,
    private readonly nafath: NafathService,
    private readonly platformStaff: PlatformStaffService,
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Verification channel today is EMAIL-first (product decision: SMS/WhatsApp
   * wait until a Unifonic subscription is active). Switching channel later is
   * an env-var change only (AUTH_OTP_CHANNEL) — no code change required.
   */
  async sendOtp(phone: string, purpose: OtpPurpose, email?: string) {
    const { code, expiresInSeconds } = await this.otp.send(phone, purpose);
    const channel = this.config.get<OtpChannel>('AUTH_OTP_CHANNEL', 'EMAIL');

    const customer = await this.prisma.customer.findUnique({
      where: { phone },
    });

    if (channel === 'EMAIL') {
      const resolvedEmail = email ?? customer?.email ?? undefined;
      if (!resolvedEmail) {
        throw new DomainException(
          'VALIDATION_ERROR',
          'Email is required to receive the verification code',
        );
      }

      if (customer && customer.email !== resolvedEmail) {
        await this.prisma.customer.update({
          where: { id: customer.id },
          data: { email: resolvedEmail },
        });
      }

      await this.notifications.send({
        recipientType: 'customer',
        recipientId: customer?.id ?? phone,
        channel: 'EMAIL',
        template: 'otp_code',
        payload: { code, purpose, expiresInSeconds, to: resolvedEmail },
      });
    } else {
      await this.notifications.send({
        recipientType: 'customer',
        recipientId: customer?.id ?? phone,
        channel,
        template: 'otp_code',
        payload: { code, purpose, expiresInSeconds, to: phone },
      });
    }

    return { code, expiresInSeconds };
  }

  async verifyOtp(
    phone: string,
    purpose: OtpPurpose,
    code: string,
    fullName?: string,
  ) {
    await this.otp.verify(phone, purpose, code);

    let customer = await this.prisma.customer.findUnique({ where: { phone } });
    const isNewUser = !customer;

    if (isNewUser) {
      if (!fullName) {
        throw new DomainException(
          'VALIDATION_ERROR',
          'fullName is required for new users',
        );
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
    return {
      ...tokens,
      role: user.role,
      merchantId: user.merchantId,
      userId: user.id,
    };
  }
}
