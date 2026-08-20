import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { IntegrationService } from './services/integration.service';
import { ApiCredentialGuard } from './guards/api-credential.guard';
import { CurrentMerchant } from './decorators/current-merchant.decorator';
import type { MerchantContext } from './decorators/current-merchant.decorator';
import {
  CreateChargeDto,
  CreateRefundDto,
  RegisterCustomerMappingDto,
  RegisterWebhookDto,
} from './dto/integration.dto';

@Controller('integration/v1')
@UseGuards(ApiCredentialGuard)
export class IntegrationController {
  constructor(private readonly integration: IntegrationService) {}

  @Post('customers/mapping')
  async registerCustomerMapping(
    @CurrentMerchant() merchant: MerchantContext,
    @Body() dto: RegisterCustomerMappingDto,
  ) {
    return this.integration.registerCustomerMapping(merchant.merchantId, dto);
  }

  @Post('charges')
  async createCharge(
    @CurrentMerchant() merchant: MerchantContext,
    @Body() dto: CreateChargeDto,
    @Headers('Idempotency-Key') idempotencyKey: string,
  ) {
    if (!idempotencyKey) {
      return {
        statusCode: 400,
        message: 'Idempotency-Key header is required',
        code: 'VALIDATION_ERROR',
      };
    }
    return this.integration.createCharge(
      merchant.merchantId,
      dto,
      idempotencyKey,
    );
  }

  @Get('charges/:externalSystem/:externalTransactionId')
  async getChargeStatus(
    @CurrentMerchant() merchant: MerchantContext,
    @Param('externalSystem') externalSystem: string,
    @Param('externalTransactionId') externalTransactionId: string,
  ) {
    return this.integration.getChargeStatus(
      merchant.merchantId,
      externalSystem,
      externalTransactionId,
    );
  }

  @Post('refunds')
  async createRefund(
    @CurrentMerchant() merchant: MerchantContext,
    @Body() dto: CreateRefundDto,
    @Headers('Idempotency-Key') idempotencyKey: string,
  ) {
    if (!idempotencyKey) {
      return {
        statusCode: 400,
        message: 'Idempotency-Key header is required',
        code: 'VALIDATION_ERROR',
      };
    }
    return this.integration.refundCharge(
      merchant.merchantId,
      dto,
      idempotencyKey,
    );
  }

  @Post('webhooks')
  async registerWebhook(
    @CurrentMerchant() merchant: MerchantContext,
    @Body() dto: RegisterWebhookDto,
  ) {
    return this.integration.registerWebhook(merchant.merchantId, dto);
  }
}
