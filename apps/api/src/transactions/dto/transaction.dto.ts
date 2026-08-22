import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
} from 'class-validator';
import { TransactionMethod } from '@prisma/client';

export class PaymentRequestDto {
  @IsUUID()
  walletId: string;

  @IsNumber()
  @IsPositive()
  amount: number;

  @IsEnum(TransactionMethod)
  method: TransactionMethod;

  @IsString()
  @IsNotEmpty()
  token: string;

  @IsOptional()
  @IsUUID()
  branchId?: string;

  @IsOptional()
  @IsUUID()
  cashierId?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class VerifyPaymentTokenDto {
  @IsEnum(TransactionMethod)
  method: TransactionMethod;

  @IsString()
  @IsNotEmpty()
  token: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  phone?: string;
}

export class RefundRequestDto {
  @IsString()
  @IsNotEmpty()
  reason: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  amount?: number;
}

export class TransactionResponseDto {
  id: string;
  walletId: string;
  type: string;
  amount: number;
  method: string;
  status: string;
  createdAt: Date;
  remainingAmount?: number;
  branchId?: string | null;
  externalTransactionId?: string | null;
  externalSystem?: string | null;
  invoiceReference?: string | null;
}
