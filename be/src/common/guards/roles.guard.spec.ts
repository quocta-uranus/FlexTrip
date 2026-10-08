import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role, UserStatus } from '@prisma/client';
import { jest } from '@jest/globals';
import { PrismaService } from '../../prisma/prisma.service';
import { DENY_ROLES_KEY } from '../decorators/deny-roles.decorator';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { RolesGuard } from './roles.guard';

describe('RolesGuard denied roles', () => {
  type GuardUser = {
    status: UserStatus;
    emailVerifiedAt: Date | null;
    roles: Array<{ role: Role }>;
  };

  const request = { authUserId: 'user-1' } as Record<string, unknown>;
  const context = {
    getHandler: () => class Handler {},
    getClass: () => class Controller {},
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;

  const reflector = {
    getAllAndOverride: jest.fn((key: string) => {
      if (key === ROLES_KEY) return [Role.TRAVELER, Role.PROVIDER];
      if (key === DENY_ROLES_KEY) return [Role.ADMIN];
      return undefined;
    }),
  } as unknown as Reflector;

  const userFindUnique = jest.fn<() => Promise<GuardUser | null>>();
  const prisma = {
    user: { findUnique: userFindUnique },
  } as unknown as PrismaService;

  const guard = new RolesGuard(reflector, prisma);

  beforeEach(() => {
    userFindUnique.mockReset();
    delete request.authRoles;
  });

  it('allows a Provider to use customer transactions', async () => {
    userFindUnique.mockResolvedValue({
      status: UserStatus.ACTIVE,
      emailVerifiedAt: new Date(),
      roles: [{ role: Role.PROVIDER }],
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.authRoles).toEqual([Role.PROVIDER]);
  });

  it('denies an Admin-only account', async () => {
    userFindUnique.mockResolvedValue({
      status: UserStatus.ACTIVE,
      emailVerifiedAt: new Date(),
      roles: [{ role: Role.ADMIN }],
    });

    await expect(guard.canActivate(context)).rejects.toMatchObject({
      status: 403,
    });
  });

  it('denies Admin even when another allowed role is present', async () => {
    userFindUnique.mockResolvedValue({
      status: UserStatus.ACTIVE,
      emailVerifiedAt: new Date(),
      roles: [
        { role: Role.ADMIN },
        { role: Role.TRAVELER },
        { role: Role.PROVIDER },
      ],
    });

    await expect(guard.canActivate(context)).rejects.toMatchObject({
      status: 403,
    });
  });
});
