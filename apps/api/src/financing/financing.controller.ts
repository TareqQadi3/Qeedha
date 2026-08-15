import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { FinancingApplicationService } from './services/financing-application.service';
import { AdminDecisionDto, CreateFinancingApplicationDto } from './dto/financing.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { AdminRoles } from '../auth/decorators/admin-roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PlatformStaffRole } from '@prisma/client';

@Controller('financing/applications')
export class FinancingController {
  constructor(private readonly financing: FinancingApplicationService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(
    @Body() dto: CreateFinancingApplicationDto,
    @CurrentUser() user: { userId: string },
  ) {
    return this.financing.createApplication(user.userId, dto.merchantId, dto.amount, dto.planType);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async list(@CurrentUser() user: { userId: string }) {
    return this.financing.listByCustomer(user.userId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async get(@Param('id') id: string) {
    return this.financing.getApplication(id);
  }
}

@Controller('admin/applications')
export class AdminApplicationsController {
  constructor(private readonly financing: FinancingApplicationService) {}

  @Get()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @AdminRoles(PlatformStaffRole.SUPER_ADMIN, PlatformStaffRole.FINANCE, PlatformStaffRole.OPERATIONS)
  async listAll() {
    return this.financing.listAll();
  }

  @Post(':id/decide')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @AdminRoles(PlatformStaffRole.SUPER_ADMIN, PlatformStaffRole.FINANCE)
  async decide(@Param('id') id: string, @Body() dto: AdminDecisionDto) {
    if (dto.decision === 'APPROVED') {
      return this.financing.approve(id, `manual:${id}`);
    }
    return this.financing.reject(id, dto.reason);
  }
}

@Controller('financing/webhooks/:provider')
export class FinancingWebhookController {
  @Post()
  async receive(@Param('provider') _provider: string, @Body() _payload: unknown) {
    // HMAC verification and event handling to be implemented per provider.
    return { received: true };
  }
}
