import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { RequestContext } from '../../../common/request-context';
import { AdminStaffService } from './admin-staff.service';
import { CreateStaffRuleDto, UpdateStaffRuleDto } from './dto/admin-staff-rules.dto';

export const RULE_INCLUDE = {
  staff: { select: { id: true, name: true, staffProfile: { select: { employeeCode: true } } } },
} satisfies Prisma.StaffAssignmentRuleInclude;
type RuleRow = Prisma.StaffAssignmentRuleGetPayload<{ include: typeof RULE_INCLUDE }>;

export const toRuleItem = (r: RuleRow) => ({
  id: r.id, name: r.name, region: r.region, priority: r.priority, isActive: r.isActive,
  staff: { id: r.staff.id, name: r.staff.name, employeeCode: r.staff.staffProfile?.employeeCode ?? null },
});

const notFound = () => new NotFoundException({ code: 'RULE_NOT_FOUND', message: 'Không tìm thấy rule.' });

@Injectable()
export class AdminStaffRulesService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService, private readonly staff: AdminStaffService) {}

  async list() {
    const rows = await this.prisma.staffAssignmentRule.findMany({ include: RULE_INCLUDE, orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }] });
    return rows.map(toRuleItem);
  }

  async create(dto: CreateStaffRuleDto, ctx: RequestContext) {
    return this.prisma.$transaction(async (tx) => {
      await this.staff.assertStaffAvailable(tx, dto.staffId);
      const rule = await tx.staffAssignmentRule.create({ data: dto, include: RULE_INCLUDE });
      await this.audit.log(tx, ctx, { action: 'STAFF_RULE_CREATED', entityType: 'StaffAssignmentRule', entityId: rule.id, after: dto });
      return toRuleItem(rule);
    });
  }

  async update(id: string, dto: UpdateStaffRuleDto, ctx: RequestContext) {
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.staffAssignmentRule.findUnique({ where: { id } });
      if (!before) throw notFound();
      if (dto.staffId) await this.staff.assertStaffAvailable(tx, dto.staffId);
      const rule = await tx.staffAssignmentRule.update({ where: { id }, data: dto, include: RULE_INCLUDE });
      await this.audit.log(tx, ctx, { action: 'STAFF_RULE_UPDATED', entityType: 'StaffAssignmentRule', entityId: id, before, after: dto });
      return toRuleItem(rule);
    });
  }

  async remove(id: string, ctx: RequestContext) {
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.staffAssignmentRule.findUnique({ where: { id } });
      if (!before) throw notFound();
      await tx.staffAssignmentRule.delete({ where: { id } });
      await this.audit.log(tx, ctx, { action: 'STAFF_RULE_DELETED', entityType: 'StaffAssignmentRule', entityId: id, before });
      return { ok: true as const };
    });
  }
}
