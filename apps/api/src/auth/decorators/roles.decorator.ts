import { SetMetadata } from '@nestjs/common';
import { MerchantUserRole } from '@prisma/client';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: MerchantUserRole[]) => SetMetadata(ROLES_KEY, roles);
