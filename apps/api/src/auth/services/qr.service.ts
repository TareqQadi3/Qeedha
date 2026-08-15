import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import * as speakeasy from 'speakeasy';
import { RedisService } from '../../redis/redis.service';

@Injectable()
export class QrService {
  private readonly step: number;

  constructor(
    private readonly config: ConfigService,
    private readonly redis: RedisService,
  ) {
    this.step = Number(this.config.get('QR_EXPIRES_IN_SECONDS', 60));
  }

  generate(customerId: string): string {
    return speakeasy.totp({
      secret: this.deriveSecret(customerId),
      encoding: 'base32',
      step: this.step,
      digits: 6,
    });
  }

  async verify(customerId: string, token: string): Promise<boolean> {
    const valid = speakeasy.totp.verify({
      secret: this.deriveSecret(customerId),
      encoding: 'base32',
      token,
      step: this.step,
      digits: 6,
      window: 1,
    });

    if (!valid) return false;

    const redis = this.redis.getClient();
    const key = `qr:used:${customerId}:${token}`;
    const used = await redis.get(key);
    if (used) return false;
    await redis.setex(key, this.step, '1');
    return true;
  }

  async verifyWithoutMarking(customerId: string, token: string): Promise<boolean> {
    const valid = speakeasy.totp.verify({
      secret: this.deriveSecret(customerId),
      encoding: 'base32',
      token,
      step: this.step,
      digits: 6,
      window: 1,
    });
    if (!valid) return false;
    const redis = this.redis.getClient();
    const key = `qr:used:${customerId}:${token}`;
    const used = await redis.get(key);
    return !used;
  }

  private deriveSecret(customerId: string): string {
    const master = this.config.getOrThrow<string>('QR_TOTP_SECRET');
    const hash = createHmac('sha256', master).update(customerId).digest('hex');
    // Convert hex to base32 alphabet
    return this.hexToBase32(hash);
  }

  private hexToBase32(hex: string): string {
    const base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let bits = '';
    for (const ch of hex) {
      bits += parseInt(ch, 16).toString(2).padStart(4, '0');
    }
    let base32 = '';
    for (let i = 0; i < bits.length; i += 5) {
      const chunk = bits.slice(i, i + 5).padEnd(5, '0');
      base32 += base32Chars[parseInt(chunk, 2)];
    }
    return base32;
  }
}
