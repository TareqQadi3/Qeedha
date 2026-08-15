import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OtpPurpose, Prisma } from '@prisma/client';
import { randomInt } from 'crypto';
import { compareSync, hashSync } from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { DomainException } from '../../common/exceptions/domain.exception';

@Injectable()
export class OtpService {
  private readonly otpLength: number;
  private readonly otpExpiresInSeconds: number;
  private readonly otpMaxAttempts: number;
  private readonly rateLimitPerMinute: number;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {
    this.otpLength = Number(this.config.get('OTP_LENGTH', 6));
    this.otpExpiresInSeconds = Number(this.config.get('OTP_EXPIRES_IN_SECONDS', 120));
    this.otpMaxAttempts = Number(this.config.get('OTP_MAX_ATTEMPTS', 3));
    this.rateLimitPerMinute = Number(this.config.get('OTP_RATE_LIMIT_PER_MINUTE', 3));
  }

  async send(phone: string, purpose: OtpPurpose): Promise<{ code: string; expiresInSeconds: number }> {
    await this.checkRateLimit(phone, purpose);

    const code = this.generateCode();
    const codeHash = hashSync(code, 10);
    const expiresAt = new Date(Date.now() + this.otpExpiresInSeconds * 1000);

    await this.prisma.otpCode.create({
      data: {
        phone,
        codeHash,
        purpose,
        attempts: 0,
        expiresAt,
      },
    });

    return { code, expiresInSeconds: this.otpExpiresInSeconds };
  }

  async verify(phone: string, purpose: OtpPurpose, code: string): Promise<void> {
    await this.verifyCode(phone, purpose, code, true);
  }

  async verifyWithoutConsume(phone: string, purpose: OtpPurpose, code: string): Promise<boolean> {
    const record = await this.prisma.otpCode.findFirst({
      where: { phone, purpose },
      orderBy: { createdAt: 'desc' },
    });

    if (!record || record.expiresAt < new Date() || record.usedAt) return false;
    if (record.attempts >= this.otpMaxAttempts) return false;

    const valid = compareSync(code, record.codeHash);
    if (!valid) {
      await this.prisma.otpCode.update({
        where: { id: record.id },
        data: { attempts: { increment: 1 } },
      });
      return false;
    }
    return true;
  }

  private async verifyCode(phone: string, purpose: OtpPurpose, code: string, consume: boolean): Promise<void> {
    const record = await this.prisma.otpCode.findFirst({
      where: { phone, purpose },
      orderBy: { createdAt: 'desc' },
    });

    if (!record) {
      throw new DomainException('UNAUTHORIZED', 'OTP not found');
    }

    if (record.expiresAt < new Date()) {
      throw new DomainException('UNAUTHORIZED', 'OTP expired');
    }

    if (record.usedAt) {
      throw new DomainException('UNAUTHORIZED', 'OTP already used');
    }

    if (record.attempts >= this.otpMaxAttempts) {
      throw new DomainException('UNAUTHORIZED', 'Too many attempts');
    }

    const valid = compareSync(code, record.codeHash);
    if (!valid) {
      await this.prisma.otpCode.update({
        where: { id: record.id },
        data: { attempts: { increment: 1 } },
      });
      throw new DomainException('UNAUTHORIZED', 'Invalid OTP');
    }

    await this.prisma.otpCode.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    });
  }

  private generateCode(): string {
    const max = 10 ** this.otpLength;
    return randomInt(0, max).toString().padStart(this.otpLength, '0');
  }

  private async checkRateLimit(phone: string, purpose: OtpPurpose): Promise<void> {
    const key = `otp:ratelimit:${phone}:${purpose}`;
    const redis = this.redis.getClient();
    const current = await redis.incr(key);
    if (current === 1) {
      await redis.expire(key, 60);
    }
    if (current > this.rateLimitPerMinute) {
      throw new DomainException('RATE_LIMIT', 'Too many OTP requests');
    }
  }
}
