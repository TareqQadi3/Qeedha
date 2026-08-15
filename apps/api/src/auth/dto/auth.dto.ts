import { IsEnum, IsNotEmpty, IsString, Matches } from 'class-validator';
import { OtpPurpose } from '@prisma/client';

export class OtpSendRequestDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+9665\d{8}$/)
  phone: string;

  @IsEnum(OtpPurpose)
  purpose: OtpPurpose;
}

export class OtpVerifyRequestDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+9665\d{8}$/)
  phone: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{6}$/)
  code: string;

  @IsEnum(OtpPurpose)
  purpose: OtpPurpose;

  @IsString()
  @IsNotEmpty()
  fullName?: string;
}

export class OtpSentResponseDto {
  expiresInSeconds: number;
  canResendInSeconds: number;
}

export class TokenResponseDto {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  isNewUser: boolean;
}

export class RefreshRequestDto {
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

export class PinRequestDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4,6}$/)
  pin: string;
}

export class PinVerifyRequestDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4,6}$/)
  pin: string;
}

export class NafathRequestDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{10}$/)
  nationalId: string;
}

export class PlatformStaffLoginDto {
  @IsString()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}

export class MerchantUserLoginDto {
  @IsString()
  @IsNotEmpty()
  merchantId: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\+9665\d{8}$/)
  phone: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}
