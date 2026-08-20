import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { MerchantsService } from './merchants.service';
import {
  CreateBranchDto,
  CreateMerchantDto,
  CreateMerchantUserDto,
  UpdateMerchantDto,
  UpdateMerchantStatusDto,
  UpdateMerchantUserDto,
} from './dto/merchant.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AdminGuard } from '../auth/guards/admin.guard';
import { AdminRoles } from '../auth/decorators/admin-roles.decorator';
import { MerchantUserRole, PlatformStaffRole } from '@prisma/client';

@Controller('merchants')
export class MerchantsController {
  constructor(private readonly merchants: MerchantsService) {}

  @Post()
  async create(@Body() dto: CreateMerchantDto) {
    return this.merchants.create(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(MerchantUserRole.OWNER, MerchantUserRole.MANAGER, MerchantUserRole.CASHIER)
  async getMe() {
    // Owner specific endpoint to be wired with current merchant
    return { message: 'Use /merchants/:id' };
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(MerchantUserRole.OWNER, MerchantUserRole.MANAGER)
  async findById(@Param('id') id: string) {
    return this.merchants.findById(id);
  }

  @Get(':id/public')
  @UseGuards(JwtAuthGuard)
  async findPublicById(@Param('id') id: string) {
    return this.merchants.findPublicById(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(MerchantUserRole.OWNER)
  async update(@Param('id') id: string, @Body() dto: UpdateMerchantDto) {
    return this.merchants.update(id, dto);
  }

  @Post(':id/branches')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(MerchantUserRole.OWNER, MerchantUserRole.MANAGER)
  async createBranch(@Param('id') merchantId: string, @Body() dto: CreateBranchDto) {
    return this.merchants.createBranch(merchantId, dto);
  }

  @Get(':id/branches')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(MerchantUserRole.OWNER, MerchantUserRole.MANAGER, MerchantUserRole.CASHIER)
  async listBranches(@Param('id') merchantId: string) {
    return this.merchants.listBranches(merchantId);
  }

  @Post(':id/users')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(MerchantUserRole.OWNER, MerchantUserRole.MANAGER)
  async createUser(@Param('id') merchantId: string, @Body() dto: CreateMerchantUserDto) {
    return this.merchants.createUser(merchantId, dto);
  }

  @Get(':id/users')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(MerchantUserRole.OWNER, MerchantUserRole.MANAGER)
  async listUsers(@Param('id') merchantId: string) {
    return this.merchants.listUsers(merchantId);
  }

  @Patch(':id/users/:userId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(MerchantUserRole.OWNER, MerchantUserRole.MANAGER)
  async updateUser(
    @Param('id') merchantId: string,
    @Param('userId') userId: string,
    @Body() dto: UpdateMerchantUserDto,
  ) {
    return this.merchants.updateUser(merchantId, userId, dto);
  }
}

@Controller('admin/merchants')
export class AdminMerchantsController {
  constructor(private readonly merchants: MerchantsService) {}

  @Get()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @AdminRoles(PlatformStaffRole.SUPER_ADMIN, PlatformStaffRole.OPERATIONS)
  async list(@Query('status') status?: string) {
    return this.merchants.list(status);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @AdminRoles(PlatformStaffRole.SUPER_ADMIN, PlatformStaffRole.OPERATIONS)
  async updateStatus(@Param('id') id: string, @Body() dto: UpdateMerchantStatusDto) {
    return this.merchants.updateStatus(id, dto);
  }
}
