import { Injectable } from '@nestjs/common';
import { Prisma, MerchantUserRole } from '@prisma/client';
import { hashSync } from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../common/services/encryption.service';
import { DomainException } from '../common/exceptions/domain.exception';
import {
  CreateBranchDto,
  CreateMerchantDto,
  CreateMerchantUserDto,
  UpdateMerchantDto,
  UpdateMerchantStatusDto,
  UpdateMerchantUserDto,
} from './dto/merchant.dto';

@Injectable()
export class MerchantsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  async create(dto: CreateMerchantDto) {
    const data: Prisma.MerchantCreateInput = {
      name: dto.name,
      crNumber: dto.crNumber,
      ibanEncrypted: this.encryption.encrypt(dto.iban),
      status: 'PENDING',
    };
    return this.prisma.merchant.create({ data });
  }

  async findById(id: string) {
    const merchant = await this.prisma.merchant.findUnique({ where: { id } });
    if (!merchant) throw new DomainException('NOT_FOUND', 'Merchant not found');
    return merchant;
  }

  async findPublicById(id: string) {
    const merchant = await this.prisma.merchant.findUnique({ where: { id } });
    if (!merchant) throw new DomainException('NOT_FOUND', 'Merchant not found');
    return { id: merchant.id, name: merchant.name, status: merchant.status };
  }

  async update(id: string, dto: UpdateMerchantDto) {
    const data: Prisma.MerchantUpdateInput = {};
    if (dto.name) data.name = dto.name;
    if (dto.iban) data.ibanEncrypted = this.encryption.encrypt(dto.iban);
    return this.prisma.merchant.update({ where: { id }, data });
  }

  async updateStatus(id: string, dto: UpdateMerchantStatusDto) {
    return this.prisma.merchant.update({
      where: { id },
      data: { status: dto.status },
    });
  }

  async list(status?: string) {
    return this.prisma.merchant.findMany({
      where: status ? { status: status as any } : undefined,
    });
  }

  async createBranch(merchantId: string, dto: CreateBranchDto) {
    return this.prisma.branch.create({
      data: {
        merchantId,
        name: dto.name,
        geoLocation: dto.geoLocation ?? Prisma.JsonNull,
      },
    });
  }

  async listBranches(merchantId: string) {
    return this.prisma.branch.findMany({ where: { merchantId } });
  }

  async createUser(merchantId: string, dto: CreateMerchantUserDto) {
    return this.prisma.merchantUser.create({
      data: {
        merchantId,
        fullName: dto.fullName,
        phone: dto.phone,
        passwordHash: hashSync(dto.password, 10),
        role: dto.role,
      },
    });
  }

  async listUsers(merchantId: string) {
    return this.prisma.merchantUser.findMany({ where: { merchantId } });
  }

  async updateUser(merchantId: string, userId: string, dto: UpdateMerchantUserDto) {
    const user = await this.prisma.merchantUser.findFirst({
      where: { id: userId, merchantId },
    });
    if (!user) throw new DomainException('NOT_FOUND', 'User not found');
    const data: Prisma.MerchantUserUpdateInput = {};
    if (dto.role) data.role = dto.role;
    if (dto.status) data.status = dto.status;
    return this.prisma.merchantUser.update({ where: { id: userId }, data });
  }
}
