import { IsOptional, IsString } from 'class-validator';

export class UpdateCustomerDto {
  @IsOptional()
  @IsString()
  fullName?: string;
}

export class CustomerResponseDto {
  id: string;
  phone: string;
  fullName: string;
  status: string;
  nafathVerifiedAt?: Date | null;
}
