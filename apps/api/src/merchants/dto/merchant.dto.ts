import { IsEnum, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';
import { MerchantStatus, MerchantUserRole } from '@prisma/client';

export class CreateMerchantDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  crNumber: string;

  @IsString()
  @IsNotEmpty()
  ownerPhone: string;

  @IsString()
  @IsNotEmpty()
  iban: string;
}

export class UpdateMerchantDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  iban?: string;
}

export class CreateBranchDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  geoLocation?: Record<string, number>;
}

export class CreateMerchantUserDto {
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\+9665\d{8}$/)
  phone: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsEnum(MerchantUserRole)
  role: MerchantUserRole;
}

export class UpdateMerchantUserDto {
  @IsOptional()
  @IsEnum(MerchantUserRole)
  role?: MerchantUserRole;

  @IsOptional()
  @IsString()
  status?: string;
}

export class UpdateMerchantStatusDto {
  @IsEnum(MerchantStatus)
  status: MerchantStatus;

  @IsOptional()
  @IsString()
  reason?: string;
}
