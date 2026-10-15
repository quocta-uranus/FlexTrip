import { SetMetadata } from '@nestjs/common';
import { Role } from '@prisma/client';

export const DENY_ROLES_KEY = 'deny_roles';

export const DenyRoles = (...roles: Role[]) =>
  SetMetadata(DENY_ROLES_KEY, roles);
