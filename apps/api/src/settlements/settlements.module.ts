import { Module } from '@nestjs/common';
import {
  AdminSettlementsController,
  MerchantSettlementsController,
} from './settlements.controller';
import { SettlementsService } from './settlements.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [AdminSettlementsController, MerchantSettlementsController],
  providers: [SettlementsService],
  exports: [SettlementsService],
})
export class SettlementsModule {}
