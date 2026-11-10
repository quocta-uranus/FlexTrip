import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, VoucherAudience, VoucherType } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { RequestContext } from '../../../common/request-context';
import { paginate, skipTake } from '../../../common/dto/pagination.dto';
import {
  CreatePromoBudgetDto, CreateVoucherDto, ListVouchersQueryDto, UpdatePromoBudgetDto, UpdateVoucherDto,
} from './dto/admin-voucher.dto';

@Injectable()
export class AdminVouchersService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  // ─── Vouchers ─────────────────────────────────────────────────────────────

  async list(query: ListVouchersQueryDto) {
    const where: Prisma.VoucherWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.source ? { source: query.source } : {}),
      ...(query.search
        ? { OR: [{ code: { contains: query.search, mode: 'insensitive' } }, { name: { contains: query.search, mode: 'insensitive' } }] }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.voucher.findMany({
        where, orderBy: { createdAt: 'desc' }, ...skipTake(query),
        include: { budget: { select: { id: true, name: true } } },
      }),
      this.prisma.voucher.count({ where }),
    ]);
    return paginate(items, total, query);
  }

  async create(dto: CreateVoucherDto, ctx: RequestContext) {
    this.assertValid(dto);
    const budget = await this.prisma.promoBudget.findUnique({ where: { id: dto.budgetId } });
    if (!budget) throw new BadRequestException('Ngân sách khuyến mãi không tồn tại');

    const code = dto.code.trim().toUpperCase();
    if (await this.prisma.voucher.findUnique({ where: { code } })) throw new ConflictException('Mã voucher đã tồn tại');

    return this.prisma.$transaction(async (tx) => {
      const voucher = await tx.voucher.create({
        data: {
          code, name: dto.name, description: dto.description, type: dto.type, value: dto.value,
          maxDiscount: dto.maxDiscount, minOrderValue: dto.minOrderValue ?? 0, category: dto.category,
          audience: dto.audience, assignedUserId: dto.assignedUserId, source: dto.source, status: dto.status,
          startsAt: new Date(dto.startsAt), endsAt: new Date(dto.endsAt),
          totalQuota: dto.totalQuota, perUserLimit: dto.perUserLimit ?? 1,
          budgetId: dto.budgetId, createdById: ctx.actorId,
        },
      });
      await this.audit.log(tx, ctx, { action: 'VOUCHER_CREATED', entityType: 'Voucher', entityId: voucher.id, after: voucher });
      return voucher;
    });
  }

  async update(id: string, dto: UpdateVoucherDto, ctx: RequestContext) {
    const before = await this.prisma.voucher.findUnique({ where: { id } });
    if (!before) throw new NotFoundException('Voucher không tồn tại');

    const touchesMoney = dto.value !== undefined || dto.maxDiscount !== undefined || dto.minOrderValue !== undefined || dto.budgetId !== undefined;
    if (touchesMoney && before.usedCount > 0) {
      throw new BadRequestException('Voucher đã có lượt dùng, không thể đổi mệnh giá hoặc ngân sách');
    }
    if (dto.totalQuota !== undefined && dto.totalQuota < before.usedCount) {
      throw new BadRequestException('Tổng lượt dùng không được nhỏ hơn số lượt đã dùng');
    }
    const startsAt = dto.startsAt ? new Date(dto.startsAt) : before.startsAt;
    const endsAt = dto.endsAt ? new Date(dto.endsAt) : before.endsAt;
    if (endsAt <= startsAt) throw new BadRequestException('Thời gian kết thúc phải sau thời gian bắt đầu');
    if (dto.value !== undefined && before.type === VoucherType.PERCENT && dto.value > 100) {
      throw new BadRequestException('Giảm theo phần trăm tối đa 100');
    }
    if (dto.budgetId && !(await this.prisma.promoBudget.findUnique({ where: { id: dto.budgetId } }))) {
      throw new BadRequestException('Ngân sách khuyến mãi không tồn tại');
    }

    return this.prisma.$transaction(async (tx) => {
      const after = await tx.voucher.update({
        where: { id },
        data: {
          name: dto.name, description: dto.description, status: dto.status, startsAt, endsAt,
          totalQuota: dto.totalQuota, perUserLimit: dto.perUserLimit, value: dto.value,
          maxDiscount: dto.maxDiscount, minOrderValue: dto.minOrderValue, budgetId: dto.budgetId,
        },
      });
      await this.audit.log(tx, ctx, { action: 'VOUCHER_UPDATED', entityType: 'Voucher', entityId: id, before, after });
      return after;
    });
  }

  async redemptions(id: string, query: ListVouchersQueryDto) {
    if (!(await this.prisma.voucher.findUnique({ where: { id }, select: { id: true } }))) {
      throw new NotFoundException('Voucher không tồn tại');
    }
    const where = { voucherId: id };
    const [items, total] = await Promise.all([
      this.prisma.voucherRedemption.findMany({
        where, orderBy: { createdAt: 'desc' }, ...skipTake(query),
        include: { user: { select: { id: true, name: true, email: true } } },
      }),
      this.prisma.voucherRedemption.count({ where }),
    ]);
    return paginate(items, total, query);
  }

  // ─── Promo budgets ────────────────────────────────────────────────────────

  async listBudgets() {
    const budgets = await this.prisma.promoBudget.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { vouchers: true } } },
    });
    return budgets.map((b) => ({
      id: b.id,
      name: b.name,
      isActive: b.isActive,
      totalAmount: b.totalAmount.toNumber(),
      spentAmount: b.spentAmount.toNumber(),
      reservedAmount: b.reservedAmount.toNumber(),
      remainingAmount: b.totalAmount.toNumber() - b.spentAmount.toNumber() - b.reservedAmount.toNumber(),
      voucherCount: b._count.vouchers,
      createdAt: b.createdAt,
    }));
  }

  async createBudget(dto: CreatePromoBudgetDto, ctx: RequestContext) {
    return this.prisma.$transaction(async (tx) => {
      const budget = await tx.promoBudget.create({ data: { name: dto.name, totalAmount: dto.totalAmount } });
      await this.audit.log(tx, ctx, { action: 'PROMO_BUDGET_CREATED', entityType: 'PromoBudget', entityId: budget.id, after: budget });
      return budget;
    });
  }

  async updateBudget(id: string, dto: UpdatePromoBudgetDto, ctx: RequestContext) {
    const before = await this.prisma.promoBudget.findUnique({ where: { id } });
    if (!before) throw new NotFoundException('Ngân sách không tồn tại');
    const committed = before.spentAmount.toNumber() + before.reservedAmount.toNumber();
    if (dto.totalAmount !== undefined && dto.totalAmount < committed) {
      throw new BadRequestException('Tổng ngân sách không được nhỏ hơn số đã chi và đang giữ chỗ');
    }
    return this.prisma.$transaction(async (tx) => {
      const after = await tx.promoBudget.update({ where: { id }, data: dto });
      await this.audit.log(tx, ctx, { action: 'PROMO_BUDGET_UPDATED', entityType: 'PromoBudget', entityId: id, before, after });
      return after;
    });
  }

  private assertValid(dto: CreateVoucherDto) {
    if (new Date(dto.endsAt) <= new Date(dto.startsAt)) throw new BadRequestException('Thời gian kết thúc phải sau thời gian bắt đầu');
    if (dto.type === VoucherType.PERCENT && dto.value > 100) throw new BadRequestException('Giảm theo phần trăm tối đa 100');
    if (dto.type === VoucherType.PERCENT && !dto.maxDiscount) throw new BadRequestException('Voucher phần trăm cần đặt mức giảm tối đa');
    if (dto.audience === VoucherAudience.PERSONAL && !dto.assignedUserId) throw new BadRequestException('Voucher cá nhân cần chọn người nhận');
  }
}
