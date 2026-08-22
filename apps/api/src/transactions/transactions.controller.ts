import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import {
  PaymentRequestDto,
  RefundRequestDto,
  VerifyPaymentTokenDto,
} from './dto/transaction.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('transactions')
@UseGuards(JwtAuthGuard)
export class TransactionsController {
  constructor(private readonly transactions: TransactionsService) {}

  @Post('verify-token')
  async verifyToken(@Body() dto: VerifyPaymentTokenDto) {
    return this.transactions.previewPaymentToken(dto);
  }

  @Post()
  async pay(
    @Body() dto: PaymentRequestDto,
    @Headers('Idempotency-Key') idempotencyKey: string,
  ) {
    if (!idempotencyKey) {
      return {
        statusCode: 400,
        message: 'Idempotency-Key header is required',
        code: 'VALIDATION_ERROR',
      };
    }
    return this.transactions.pay(dto, idempotencyKey);
  }

  @Get()
  async list(
    @CurrentUser() user: { userId: string; type: string },
    @Query('walletId') walletId?: string,
    @Query('cashierId') cashierId?: string,
  ) {
    if (walletId) return this.transactions.listByWallet(walletId, user);
    if (cashierId) return this.transactions.listByCashier(cashierId, user);
    return [];
  }

  @Post(':id/refund')
  async refund(
    @Param('id') id: string,
    @Body() dto: RefundRequestDto,
    @Headers('Idempotency-Key') idempotencyKey: string,
  ) {
    if (!idempotencyKey) {
      return {
        statusCode: 400,
        message: 'Idempotency-Key header is required',
        code: 'VALIDATION_ERROR',
      };
    }
    return this.transactions.refund(id, dto, idempotencyKey);
  }
}
