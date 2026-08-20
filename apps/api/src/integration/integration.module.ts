import { Module } from '@nestjs/common';
import { IntegrationController } from './integration.controller';
import { AdminCredentialsController } from './admin-credentials.controller';
import { IntegrationService } from './services/integration.service';
import { WebhookDispatchService } from './services/webhook-dispatch.service';
import { ApiCredentialGuard } from './guards/api-credential.guard';
import { AuthModule } from '../auth/auth.module';
import { TransactionsModule } from '../transactions/transactions.module';

@Module({
  imports: [AuthModule, TransactionsModule],
  controllers: [IntegrationController, AdminCredentialsController],
  providers: [IntegrationService, WebhookDispatchService, ApiCredentialGuard],
  exports: [IntegrationService],
})
export class IntegrationModule {}
