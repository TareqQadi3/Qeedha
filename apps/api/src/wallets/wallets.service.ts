import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FinancingApplicationService } from '../financing/services/financing-application.service';
import { DomainException } from '../common/exceptions/domain.exception';
import { BalanceResponseDto, CreateWalletRequestDto, WalletResponseDto } from './dto/wallet.dto';

@Injectable()
export class WalletsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly financing: FinancingApplicationService,
  ) {}

  async request(customerId: string, dto: CreateWalletRequestDto): Promise<{ applicationId: string; status: string }> {
    const application = await this.financing.createApplication(
      customerId,
      dto.merchantId,
      dto.amount,
      dto.planType,
    );
    return {
      applicationId: application!.id,
      status: application!.status,
    };
  }

  async findByCustomer(customerId: string): Promise<WalletResponseDto[]> {
    const wallets = await this.prisma.wallet.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
    });
    return wallets.map((w) => this.toDto(w));
  }

  async findById(walletId: string, customerId: string): Promise<WalletResponseDto> {
    const wallet = await this.prisma.wallet.findUnique({ where: { id: walletId } });
    if (!wallet) throw new DomainException('NOT_FOUND', 'Wallet not found');
    if (wallet.customerId !== customerId) {
      throw new DomainException('FORBIDDEN', 'Wallet does not belong to this customer');
    }
    return this.toDto(wallet);
  }

  async getBalance(walletId: string, customerId: string): Promise<BalanceResponseDto> {
    const wallet = await this.prisma.wallet.findUnique({ where: { id: walletId } });
    if (!wallet) throw new DomainException('NOT_FOUND', 'Wallet not found');
    if (wallet.customerId !== customerId) {
      throw new DomainException('FORBIDDEN', 'Wallet does not belong to this customer');
    }
    return {
      remainingAmount: Number(wallet.remainingAmount),
      totalAmount: Number(wallet.totalAmount),
      currency: 'SAR',
    };
  }

  private toDto(wallet: Awaited<ReturnType<PrismaService['wallet']['findUnique']>>): WalletResponseDto {
    if (!wallet) throw new DomainException('NOT_FOUND', 'Wallet not found');
    return {
      id: wallet.id,
      customerId: wallet.customerId,
      merchantId: wallet.merchantId,
      applicationId: wallet.applicationId,
      totalAmount: Number(wallet.totalAmount),
      remainingAmount: Number(wallet.remainingAmount),
      status: wallet.status,
      expiresAt: wallet.expiresAt,
    };
  }
}
