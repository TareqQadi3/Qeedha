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
import {
  MerchantUserRole,
  PlatformStaffRole,
  SettlementStatus,
} from '@prisma/client';
import { SettlementsService } from './settlements.service';
import { MarkPaidDto, RunSettlementDto } from './dto/settlement.dto';
import { PrismaService } from '../prisma/prisma.service';
import { DomainException } from '../common/exceptions/domain.exception';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { AdminRoles } from '../auth/decorators/admin-roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('admin/settlements')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminSettlementsController {
  constructor(private readonly settlements: SettlementsService) {}

  @Post('run')
  @AdminRoles(PlatformStaffRole.SUPER_ADMIN, PlatformStaffRole.FINANCE)
  async run(@Body() dto: RunSettlementDto) {
    return this.settlements.runForAllMerchants(dto.period);
  }

  @Get()
  @AdminRoles(
    PlatformStaffRole.SUPER_ADMIN,
    PlatformStaffRole.FINANCE,
    PlatformStaffRole.OPERATIONS,
  )
  async list(
    @Query('merchantId') merchantId?: string,
    @Query('status') status?: SettlementStatus,
  ) {
    return this.settlements.listAll({ merchantId, status });
  }

  @Get(':id')
  @AdminRoles(
    PlatformStaffRole.SUPER_ADMIN,
    PlatformStaffRole.FINANCE,
    PlatformStaffRole.OPERATIONS,
  )
  async get(@Param('id') id: string) {
    return this.settlements.getById(id);
  }

  @Patch(':id/pay')
  @AdminRoles(PlatformStaffRole.SUPER_ADMIN, PlatformStaffRole.FINANCE)
  async pay(@Param('id') id: string, @Body() dto: MarkPaidDto) {
    return this.settlements.markPaid(id, dto.bankRef);
  }

  @Patch(':id/reconcile')
  @AdminRoles(PlatformStaffRole.SUPER_ADMIN, PlatformStaffRole.FINANCE)
  async reconcile(@Param('id') id: string) {
    return this.settlements.reconcile(id);
  }
}

@Controller('merchants/:merchantId/settlements')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(MerchantUserRole.OWNER, MerchantUserRole.MANAGER)
export class MerchantSettlementsController {
  constructor(
    private readonly settlements: SettlementsService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  async list(
    @Param('merchantId') merchantId: string,
    @CurrentUser() user: { userId: string },
  ) {
    const merchantUser = await this.prisma.merchantUser.findUnique({
      where: { id: user.userId },
      select: { merchantId: true },
    });
    if (!merchantUser || merchantUser.merchantId !== merchantId) {
      throw new DomainException(
        'FORBIDDEN',
        "Cannot view another merchant's settlements",
      );
    }
    return this.settlements.listForMerchant(merchantId);
  }
}
