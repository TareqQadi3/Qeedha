import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CustomersService } from './customers.service';
import { UpdateCustomerDto } from './dto/customer.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { NafathRequestDto } from '../auth/dto/auth.dto';
import { NafathService } from '../auth/services/nafath.service';
import { QrService } from '../auth/services/qr.service';
import { PrismaService } from '../prisma/prisma.service';


@Controller('customers')
@UseGuards(JwtAuthGuard)
export class CustomersController {
  constructor(
    private readonly customers: CustomersService,
    private readonly nafath: NafathService,
    private readonly qr: QrService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  @Get('me')
  async getMe(@CurrentUser() user: { userId: string }) {
    return this.customers.getMe(user.userId);
  }

  @Patch('me')
  async updateMe(@Body() dto: UpdateCustomerDto, @CurrentUser() user: { userId: string }) {
    return this.customers.updateMe(user.userId, dto);
  }

  @Post('me/kyc/nafath')
  async initiateKyc(
    @Body() dto: NafathRequestDto,
    @CurrentUser() user: { userId: string },
  ) {
    const result = await this.nafath.initiate(user.userId, dto.nationalId);
    await this.prisma.customer.update({
      where: { id: user.userId },
      data: { nationalIdHash: dto.nationalId },
    });
    return result;
  }

  @Get('me/qr-code')
  async getQrCode(@CurrentUser() user: { userId: string }) {
    const code = this.qr.generate(user.userId);
    const expiresInSeconds = Number(this.config.get('QR_EXPIRES_IN_SECONDS', 60));
    return {
      token: `${user.userId}:${code}`,
      expiresInSeconds,
    };
  }
}
