import { SetMetadata } from '@nestjs/common';
import { PlatformStaffRole } from '@prisma/client';

export const ADMIN_ROLES_KEY = 'adminRoles';
export const AdminRoles = (...roles: PlatformStaffRole[]) => SetMetadata(ADMIN_ROLES_KEY, roles);
