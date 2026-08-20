import {
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsPositive,
  IsString,
  IsUrl,
  IsUUID,
} from 'class-validator';

export class RegisterCustomerMappingDto {
  @IsString()
  @IsNotEmpty()
  externalSystem: string;

  @IsString()
  @IsNotEmpty()
  externalCustomerId: string;

  @IsUUID()
  qeedhaCustomerId: string;
}

export class CreateChargeDto {
  @IsString()
  @IsNotEmpty()
  externalCustomerId: string;

  @IsString()
  @IsNotEmpty()
  externalSystem: string;

  @IsString()
  @IsNotEmpty()
  externalTransactionId: string;

  @IsNumber()
  @IsPositive()
  amount: number;

  // v1 limitation: Qeedha wallets only settle in SAR, so this must equal 'SAR'.
  // Multi-currency support is out of scope for this phase.
  @IsString()
  @IsNotEmpty()
  currency: string;

  @IsOptional()
  @IsString()
  invoiceReference?: string;

  @IsOptional()
  @IsUUID()
  branchReference?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class CreateRefundDto {
  @IsString()
  @IsNotEmpty()
  externalSystem: string;

  @IsString()
  @IsNotEmpty()
  externalTransactionId: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  amount?: number;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class CreateApiCredentialDto {
  @IsString()
  @IsNotEmpty()
  name: string;
}

export class RegisterWebhookDto {
  @IsUrl(
    { require_protocol: true },
    { message: 'url must be a valid URL (https preferred)' },
  )
  url: string;

  @IsOptional()
  @IsString({ each: true })
  events?: string[];
}

export interface IntegrationChargeResponse {
  qeedhaTransactionId: string;
  externalTransactionId: string;
  status: 'SUCCESS' | 'PENDING' | 'FAILED';
  amount: number;
  currency: string;
  invoiceReference?: string | null;
  branchReference?: string | null;
  createdAt: Date;
}
