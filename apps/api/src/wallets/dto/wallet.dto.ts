import { IsEnum, IsNotEmpty, IsNumber, IsPositive, IsUUID } from 'class-validator';
import { FinancingPlan } from '@prisma/client';

export class CreateWalletRequestDto {
  @IsUUID()
  merchantId: string;

  @IsNumber()
  @IsPositive()
  amount: number;

  @IsEnum(FinancingPlan)
  planType: FinancingPlan;
}

export class WalletResponseDto {
  id: string;
  customerId: string;
  merchantId: string;
  applicationId: string;
  totalAmount: number;
  remainingAmount: number;
  status: string;
  expiresAt?: Date | null;
}

export class BalanceResponseDto {
  remainingAmount: number;
  totalAmount: number;
  currency: string;
}
