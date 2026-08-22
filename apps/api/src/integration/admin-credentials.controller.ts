import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { PlatformStaffRole } from '@prisma/client';
import { IntegrationService } from './services/integration.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { AdminRoles } from '../auth/decorators/admin-roles.decorator';
import { CreateApiCredentialDto } from './dto/integration.dto';

@Controller('admin/merchants/:merchantId/api-credentials')
@UseGuards(JwtAuthGuard, AdminGuard)
@AdminRoles(PlatformStaffRole.SUPER_ADMIN, PlatformStaffRole.OPERATIONS)
export class AdminCredentialsController {
  constructor(private readonly integration: IntegrationService) {}

  @Post()
  async create(
    @Param('merchantId') merchantId: string,
    @Body() dto: CreateApiCredentialDto,
  ) {
    return this.integration.createApiCredential(merchantId, dto.name);
  }

  @Get()
  async list(@Param('merchantId') merchantId: string) {
    return this.integration.listApiCredentials(merchantId);
  }

  @Patch(':credentialId/revoke')
  async revoke(
    @Param('merchantId') merchantId: string,
    @Param('credentialId') credentialId: string,
  ) {
    return this.integration.revokeApiCredential(merchantId, credentialId);
  }
}
