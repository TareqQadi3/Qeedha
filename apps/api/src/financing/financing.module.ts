import { Module } from '@nestjs/common';
import { FinancingController, AdminApplicationsController, FinancingWebhookController } from './financing.controller';
import { FinancingApplicationService } from './services/financing-application.service';
import { FinancingGatewayService } from './services/financing-gateway.service';
import { ManualAdapter } from './adapters/manual.adapter';
import { AuthModule } from '../auth/auth.module';
import { LedgerModule } from '../ledger/ledger.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [AuthModule, LedgerModule, NotificationsModule],
  controllers: [FinancingController, AdminApplicationsController, FinancingWebhookController],
  providers: [FinancingApplicationService, FinancingGatewayService, ManualAdapter],
  exports: [FinancingApplicationService, FinancingGatewayService],
})
export class FinancingModule {}
