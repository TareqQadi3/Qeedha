import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './services/auth.service';
import {
  NafathRequestDto,
  OtpSendRequestDto,
  OtpVerifyRequestDto,
  PinRequestDto,
  PinVerifyRequestDto,
  PlatformStaffLoginDto,
  MerchantUserLoginDto,
  RefreshRequestDto,
} from './dto/auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('otp/send')
  @HttpCode(HttpStatus.ACCEPTED)
  async sendOtp(@Body() dto: OtpSendRequestDto) {
    const { expiresInSeconds } = await this.auth.sendOtp(dto.phone, dto.purpose);
    return {
      expiresInSeconds,
      canResendInSeconds: 60,
    };
  }

  @Post('otp/verify')
  async verifyOtp(@Body() dto: OtpVerifyRequestDto) {
    return this.auth.verifyOtp(dto.phone, dto.purpose, dto.code, dto.fullName);
  }

  @Post('refresh')
  async refresh(@Body() dto: RefreshRequestDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(@Body() dto: RefreshRequestDto) {
    await this.auth.logout(dto.refreshToken);
    return { success: true };
  }

  @Post('pin/set')
  @UseGuards(JwtAuthGuard)
  async setPin(@Body() dto: PinRequestDto, @CurrentUser() user: { userId: string }) {
    await this.auth.setCustomerPin(user.userId, dto.pin);
    return { success: true };
  }

  @Post('pin/verify')
  @UseGuards(JwtAuthGuard)
  async verifyPin(@Body() dto: PinVerifyRequestDto, @CurrentUser() user: { userId: string }) {
    await this.auth.verifyCustomerPin(user.userId, dto.pin);
    return { success: true };
  }

  @Post('nafath/initiate')
  @UseGuards(JwtAuthGuard)
  async initiateNafath(
    @Body() dto: NafathRequestDto,
    @CurrentUser() user: { userId: string },
  ) {
    return this.auth.initiateNafath(user.userId, dto.nationalId);
  }

  @Post('admin/login')
  @HttpCode(HttpStatus.OK)
  async loginAdmin(@Body() dto: PlatformStaffLoginDto) {
    return this.auth.loginPlatformStaff(dto.email, dto.password);
  }

  @Post('merchant/login')
  @HttpCode(HttpStatus.OK)
  async loginMerchant(@Body() dto: MerchantUserLoginDto) {
    return this.auth.loginMerchantUser(dto.merchantId, dto.phone, dto.password);
  }
}
