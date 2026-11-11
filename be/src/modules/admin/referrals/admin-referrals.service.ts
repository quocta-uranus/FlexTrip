import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { paginate, skipTake } from '../../../common/dto/pagination.dto';
import { AdminReferralListQueryDto } from '../../referrals/dto/referrals.dto';

@Injectable()
export class AdminReferralsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: AdminReferralListQueryDto) {
    const where: Prisma.ReferralWhereInput = query.status ? { status: query.status } : {};
    const [items, total] = await Promise.all([
      this.prisma.referral.findMany({
        where, orderBy: { createdAt: 'desc' }, ...skipTake(query),
        include: {
          referrer: { select: { id: true, name: true, email: true } },
          referee: { select: { id: true, name: true, email: true } },
        },
      }),
      this.prisma.referral.count({ where }),
    ]);
    return paginate(items, total, query);
  }
}
