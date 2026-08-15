import { Module } from '@nestjs/common';
import { MerchantsController, AdminMerchantsController } from './merchants.controller';
import { MerchantsService } from './merchants.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [MerchantsController, AdminMerchantsController],
  providers: [MerchantsService],
  exports: [MerchantsService],
})
export class MerchantsModule {}
