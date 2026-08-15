import { IsEnum, IsNotEmpty, IsNumber, IsPositive, IsString, IsUUID } from 'class-validator';
import { FinancingPlan } from '@prisma/client';

export class CreateFinancingApplicationDto {
  @IsUUID()
  merchantId: string;

  @IsNumber()
  @IsPositive()
  amount: number;

  @IsEnum(FinancingPlan)
  planType: FinancingPlan;
}

export class AdminDecisionDto {
  @IsString()
  @IsNotEmpty()
  decision: 'APPROVED' | 'REJECTED';

  @IsString()
  @IsNotEmpty()
  reason: string;
}
