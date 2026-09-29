import { Role } from '@prisma/client';
import type { AuthenticatedRequest } from '../modules/auth/guards/access-token.guard';

export interface RequestContext {
  actorId: string;
  actorRole: Role | null;
  ip: string | null;
  userAgent: string | null;
}

const ROLE_PRIORITY: Role[] = [Role.ADMIN, Role.STAFF, Role.PROVIDER, Role.TRAVELER];

export function requestContext(req: AuthenticatedRequest, fallbackRole: Role | null = null): RequestContext {
  const roles = req.authRoles ?? [];
  const ua = req.headers['user-agent'];
  return {
    actorId: req.authUserId,
    actorRole: ROLE_PRIORITY.find((r) => roles.includes(r)) ?? fallbackRole,
    ip: req.ip ?? null,
    userAgent: typeof ua === 'string' ? ua.slice(0, 500) : null,
  };
}
