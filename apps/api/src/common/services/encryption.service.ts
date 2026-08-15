import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

@Injectable()
export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly key: Buffer;

  constructor(private readonly config: ConfigService) {
    const secret = this.config.getOrThrow<string>('ENCRYPTION_KEY');
    this.key = scryptSync(secret, 'salt', 32);
  }

  encrypt(plaintext: string): string {
    const iv = randomBytes(16);
    const authTagLength = 16;
    const cipher = createCipheriv(this.algorithm, this.key, iv, {
      authTagLength,
    });
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  decrypt(ciphertext: string): string {
    const [ivHex, authTagHex, encrypted] = ciphertext.split(':');
    if (!ivHex || !authTagHex || !encrypted) {
      throw new Error('Invalid encrypted payload format');
    }
    const decipher = createDecipheriv(
      this.algorithm,
      this.key,
      Buffer.from(ivHex, 'hex'),
      { authTagLength: 16 },
    );
    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
}
