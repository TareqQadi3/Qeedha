import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomBytes, createHash } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { DomainException } from '../../common/exceptions/domain.exception';

export interface TokenPayload {
  sub: string;
  type: 'customer' | 'merchant_user' | 'platform_staff';
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

@Injectable()
export class TokenService {
  private readonly accessExpiresIn: number;
  private readonly refreshExpiresIn: number;

  constructor(
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {
    this.accessExpiresIn = this.parseSeconds(config.get<string>('JWT_ACCESS_EXPIRES_IN', '15m'));
    this.refreshExpiresIn = this.parseSeconds(config.get<string>('JWT_REFRESH_EXPIRES_IN', '7d'));
  }

  async generateCustomerTokens(customerId: string): Promise<TokenPair> {
    return this.generateTokens(customerId, 'customer');
  }

  async generateMerchantUserTokens(userId: string): Promise<TokenPair> {
    return this.generateTokens(userId, 'merchant_user');
  }

  async generatePlatformStaffTokens(staffId: string): Promise<TokenPair> {
    return this.generateTokens(staffId, 'platform_staff');
  }

  async refresh(refreshToken: string): Promise<TokenPair> {
    const hash = this.hashToken(refreshToken);
    const record = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: hash },
    });

    if (!record || record.revokedAt || record.expiresAt < new Date()) {
      throw new DomainException('UNAUTHORIZED', 'Invalid refresh token');
    }

    await this.prisma.refreshToken.update({
      where: { id: record.id },
      data: { revokedAt: new Date() },
    });

    let type: TokenPayload['type'];
    let subject: string;
    if (record.customerId) {
      type = 'customer';
      subject = record.customerId;
    } else if (record.merchantUserId) {
      type = 'merchant_user';
      subject = record.merchantUserId;
    } else if (record.platformStaffId) {
      type = 'platform_staff';
      subject = record.platformStaffId;
    } else {
      throw new DomainException('UNAUTHORIZED', 'Invalid refresh token');
    }
    return this.generateTokens(subject, type, record.id);
  }

  async revoke(refreshToken: string): Promise<void> {
    const hash = this.hashToken(refreshToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: hash },
      data: { revokedAt: new Date() },
    });
  }

  private async generateTokens(
    subject: string,
    type: 'customer' | 'merchant_user' | 'platform_staff',
    rotatedFrom?: string,
  ): Promise<TokenPair> {
    const payload: TokenPayload = { sub: subject, type };
    const accessToken = this.jwt.sign(payload, {
      secret: this.config.getOrThrow<string>('JWT_SECRET'),
      expiresIn: this.accessExpiresIn,
    });

    const plainRefresh = randomBytes(32).toString('hex');
    const refreshHash = this.hashToken(plainRefresh);
    const expiresAt = new Date(Date.now() + this.refreshExpiresIn * 1000);

    const data = {
      tokenHash: refreshHash,
      expiresAt,
      rotatedFrom,
    } as any;

    if (type === 'customer') {
      data.customerId = subject;
    } else if (type === 'merchant_user') {
      data.merchantUserId = subject;
    } else if (type === 'platform_staff') {
      data.platformStaffId = subject;
    }

    await this.prisma.refreshToken.create({ data });

    return {
      accessToken,
      refreshToken: plainRefresh,
      expiresIn: this.accessExpiresIn,
    };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private parseSeconds(value: string): number {
    const match = value.match(/^(\d+)([smhd]?)$/);
    if (!match) return 900;
    const num = Number(match[1]);
    const unit = match[2];
    switch (unit) {
      case 's':
        return num;
      case 'm':
        return num * 60;
      case 'h':
        return num * 3600;
      case 'd':
        return num * 86400;
      default:
        return num;
    }
  }
}
