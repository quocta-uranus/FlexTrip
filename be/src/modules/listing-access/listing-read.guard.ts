import {
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ListingStatus, Role, UserStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AccessTokenGuard,
  AuthenticatedRequest,
} from '../auth/guards/access-token.guard';

export interface ListingReadRequest extends AuthenticatedRequest {
  listingReadOwner?: boolean;
}

@Injectable()
export class ListingReadGuard implements CanActivate {
  constructor(
    private readonly accessToken: AccessTokenGuard,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<ListingReadRequest>();
    request.listingReadOwner = false;
    // Public requests need no token; a supplied token must be verified normally.
    if (request.headers.authorization !== undefined) {
      await this.accessToken.canActivate(context);
    }
    const id = request.params.listingId ?? request.params.id;
    if (typeof id !== 'string')
      throw new NotFoundException('Không tìm thấy tin đăng.');
    const listing = await this.prisma.listing.findUnique({
      where: { id },
      select: { id: true, status: true, providerId: true },
    });
    if (!listing) throw new NotFoundException('Không tìm thấy tin đăng.');

    if (request.authUserId && listing.providerId === request.authUserId) {
      const user = await this.prisma.user.findUnique({
        where: { id: request.authUserId },
        select: {
          status: true,
          emailVerifiedAt: true,
          roles: { select: { role: true } },
        },
      });
      request.listingReadOwner = Boolean(
        user?.status === UserStatus.ACTIVE &&
        user.emailVerifiedAt &&
        user.roles.some(({ role }) => role === Role.PROVIDER),
      );
    }
    // Admin/Staff use their existing protected management routes, not a bypass here.
    if (listing.status !== ListingStatus.ACTIVE && !request.listingReadOwner) {
      throw new NotFoundException('Không tìm thấy tin đăng.');
    }
    return true;
  }
}
