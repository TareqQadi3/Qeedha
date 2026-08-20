import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class RunSettlementDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'period must be in YYYY-MM-DD format',
  })
  period: string;
}

export class MarkPaidDto {
  @IsString()
  @IsNotEmpty()
  bankRef: string;
}
