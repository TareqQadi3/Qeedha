import { Global, Module } from '@nestjs/common';
import { AuditService } from './services/audit.service';
import { EncryptionService } from './services/encryption.service';
import { IdempotencyService } from './services/idempotency.service';
import { PrismaModule } from '../prisma/prisma.module';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [AuditService, EncryptionService, IdempotencyService],
  exports: [AuditService, EncryptionService, IdempotencyService],
})
export class CommonModule {}
