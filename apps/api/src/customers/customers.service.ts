import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DomainException } from '../common/exceptions/domain.exception';
import { CustomerResponseDto, UpdateCustomerDto } from './dto/customer.dto';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async getMe(customerId: string): Promise<CustomerResponseDto> {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
    });
    if (!customer) throw new DomainException('NOT_FOUND', 'Customer not found');
    return this.toDto(customer);
  }

  async updateMe(customerId: string, dto: UpdateCustomerDto): Promise<CustomerResponseDto> {
    const customer = await this.prisma.customer.update({
      where: { id: customerId },
      data: { fullName: dto.fullName },
    });
    return this.toDto(customer);
  }

  private toDto(customer: Awaited<ReturnType<PrismaService['customer']['findUnique']>>): CustomerResponseDto {
    if (!customer) throw new DomainException('NOT_FOUND', 'Customer not found');
    return {
      id: customer.id,
      phone: customer.phone,
      fullName: customer.fullName,
      status: customer.status,
      nafathVerifiedAt: customer.nafathVerifiedAt,
    };
  }
}
