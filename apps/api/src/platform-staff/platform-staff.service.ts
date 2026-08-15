import { Injectable } from '@nestjs/common';
import { PlatformStaffRole, PlatformStaffStatus, Prisma } from '@prisma/client';
import { compareSync, hashSync } from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { DomainException } from '../common/exceptions/domain.exception';

export interface CreatePlatformStaffInput {
  email: string;
  password: string;
  role: PlatformStaffRole;
}

@Injectable()
export class PlatformStaffService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreatePlatformStaffInput) {
    const existing = await this.prisma.platformStaff.findUnique({
      where: { email: input.email },
    });
    if (existing) {
      throw new DomainException('CONFLICT', 'Email already registered');
    }
    return this.prisma.platformStaff.create({
      data: {
        email: input.email,
        passwordHash: hashSync(input.password, 10),
        role: input.role,
        status: 'ACTIVE',
      },
    });
  }

  async findByEmail(email: string) {
    return this.prisma.platformStaff.findUnique({ where: { email } });
  }

  async findById(id: string) {
    return this.prisma.platformStaff.findUnique({ where: { id } });
  }

  async list() {
    return this.prisma.platformStaff.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async updateStatus(id: string, status: PlatformStaffStatus) {
    return this.prisma.platformStaff.update({ where: { id }, data: { status } });
  }

  async verifyPassword(staffId: string, password: string): Promise<boolean> {
    const staff = await this.findById(staffId);
    if (!staff) return false;
    return compareSync(password, staff.passwordHash);
  }
}
