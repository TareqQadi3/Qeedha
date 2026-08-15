import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { WalletsService } from './wallets.service';
import { CreateWalletRequestDto } from './dto/wallet.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('wallets')
@UseGuards(JwtAuthGuard)
export class WalletsController {
  constructor(private readonly wallets: WalletsService) {}

  @Post()
  async request(@Body() dto: CreateWalletRequestDto, @CurrentUser() user: { userId: string }) {
    return this.wallets.request(user.userId, dto);
  }

  @Get()
  async list(@CurrentUser() user: { userId: string }) {
    return this.wallets.findByCustomer(user.userId);
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    return this.wallets.findById(id);
  }

  @Get(':id/balance')
  async balance(@Param('id') id: string) {
    return this.wallets.getBalance(id);
  }
}
