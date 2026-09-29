import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ListingFlagStatus, ListingStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { paginate, skipTake } from '../../../common/dto/pagination.dto';
import { toNumber } from '../../../common/money.util';
import { RequestContext } from '../../../common/request-context';
import { ListAdminListingsQueryDto, ListingTab, ModerateAction, ModerateListingDto } from './dto/admin-listings.dto';

const { ACTIVE, INACTIVE, DRAFT, SUSPENDED, REMOVED } = ListingStatus;

const TRANSITIONS: Record<ModerateAction, { from: ListingStatus[]; to?: ListingStatus; flags?: ListingFlagStatus }> = {
  HIDE: { from: [ACTIVE, INACTIVE], to: SUSPENDED, flags: ListingFlagStatus.RESOLVED },
  REMOVE: { from: [DRAFT, ACTIVE, INACTIVE, SUSPENDED], to: REMOVED, flags: ListingFlagStatus.RESOLVED },
  RESTORE: { from: [SUSPENDED, REMOVED], to: ACTIVE },
  KEEP: { from: [ACTIVE, INACTIVE], flags: ListingFlagStatus.DISMISSED },
};

const OPEN = { status: ListingFlagStatus.OPEN };

function tabWhere(tab: ListingTab): Prisma.ListingWhereInput {
  if (tab === 'FLAGGED') return { status: { not: REMOVED }, flags: { some: OPEN } };
  if (tab === 'ALL') return {};
  return { status: tab };
}

const LIST_SELECT = {
  id: true, title: true, price: true, currency: true, location: true, category: true,
  imageUrls: true, status: true, createdAt: true,
  provider: { select: { id: true, name: true } },
  flags: { where: OPEN, orderBy: { createdAt: 'desc' as const }, take: 1, select: { reason: true, createdAt: true } },
  _count: { select: { flags: { where: OPEN } } },
} satisfies Prisma.ListingSelect;

@Injectable()
export class AdminListingsService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  async list(q: ListAdminListingsQueryDto) {
    const search = q.search?.trim();
    const where: Prisma.ListingWhereInput = {
      ...tabWhere(q.tab),
      ...(q.category ? { category: q.category } : {}),
      ...(search
        ? { OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { provider: { name: { contains: search, mode: 'insensitive' } } },
            { id: search },
          ] }
        : {}),
    };
    // Prisma cannot order by a filtered relation count; total flag count is a close proxy.
    const orderBy: Prisma.ListingOrderByWithRelationInput[] =
      q.tab === 'FLAGGED' ? [{ flags: { _count: 'desc' } }, { createdAt: 'desc' }] : [{ createdAt: 'desc' }];
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.listing.findMany({ where, select: LIST_SELECT, orderBy, ...skipTake(q) }),
      this.prisma.listing.count({ where }),
    ]);
    return paginate(
      rows.map((l) => ({
        id: l.id, title: l.title, price: toNumber(l.price), currency: l.currency, location: l.location,
        category: l.category, imageUrl: l.imageUrls[0] ?? null, status: l.status, provider: l.provider,
        openFlagsCount: l._count.flags, latestFlag: l.flags[0] ?? null, createdAt: l.createdAt,
      })),
      total,
      q,
    );
  }

  async stats() {
    const weekAgo = new Date(Date.now() - 7 * 24 * 3600_000);
    const [flagged, suspended, removedThisWeek, avg] = await Promise.all([
      this.prisma.listing.count({ where: tabWhere('FLAGGED') }),
      this.prisma.listing.count({ where: { status: SUSPENDED } }),
      this.prisma.auditLog.count({ where: { action: 'LISTING_REMOVE', createdAt: { gte: weekAgo } } }),
      this.prisma.$queryRaw<{ hours: number | null }[]>`
        SELECT AVG(EXTRACT(EPOCH FROM ("resolvedAt" - "createdAt")) / 3600)::float AS hours
        FROM "ListingFlag" WHERE "resolvedAt" >= NOW() - INTERVAL '30 days'`,
    ]);
    const hours = avg[0]?.hours;
    return { flagged, suspended, removedThisWeek, avgResolutionHours: hours === null || hours === undefined ? null : Math.round(hours * 10) / 10 };
  }

  async flags(listingId: string) {
    return this.prisma.listingFlag.findMany({
      where: { listingId },
      orderBy: { createdAt: 'desc' },
      include: {
        reporter: { select: { id: true, name: true } },
        resolvedBy: { select: { id: true, name: true } },
      },
    });
  }

  async moderate(id: string, dto: ModerateListingDto, ctx: RequestContext) {
    return this.prisma.$transaction(async (tx) => {
      const listing = await tx.listing.findUnique({ where: { id }, select: { status: true } });
      if (!listing) throw new NotFoundException({ code: 'LISTING_NOT_FOUND', message: 'Không tìm thấy tin đăng.' });
      const rule = TRANSITIONS[dto.action];
      if (!rule.from.includes(listing.status))
        throw new ConflictException({
          code: 'INVALID_TRANSITION',
          message: `Không thể thực hiện ${dto.action} với tin ở trạng thái ${listing.status}.`,
        });
      if (dto.action === 'KEEP' && (await tx.listingFlag.count({ where: { listingId: id, ...OPEN } })) === 0)
        throw new ConflictException({ code: 'NO_OPEN_FLAGS', message: 'Tin này không có báo cáo nào đang chờ.' });

      const status = rule.to ?? listing.status;
      if (rule.to) await tx.listing.update({ where: { id }, data: { status: rule.to } });
      let flagsUpdated = 0;
      if (rule.flags) {
        const res = await tx.listingFlag.updateMany({
          where: { listingId: id, ...OPEN },
          data: { status: rule.flags, resolvedById: ctx.actorId, resolvedAt: new Date(), resolutionNote: dto.note ?? null },
        });
        flagsUpdated = res.count;
      }
      await this.audit.log(tx, ctx, {
        action: `LISTING_${dto.action}`,
        entityType: 'Listing', entityId: id,
        before: { status: listing.status },
        after: { status, flagsUpdated, note: dto.note ?? null },
      });
      return { id, status, flagsUpdated };
    });
  }
}
