import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { paginate, skipTake } from '../../../common/dto/pagination.dto';
import { resolveRange, startOfTodayVn } from '../../../common/dto/date-range.dto';
import { toCsv } from '../../../common/csv.util';
import { AUDIT_LOG_INCLUDE, toAuditLogItem } from '../../audit/audit-log.view';
import { ListAuditLogsQueryDto } from './dto/admin-audit-logs.dto';

@Injectable()
export class AdminAuditLogsService {
  constructor(private readonly prisma: PrismaService) {}

  private where(q: ListAuditLogsQueryDto): Prisma.AuditLogWhereInput {
    const range = q.from || q.to ? resolveRange(q, 30) : null;
    const search = q.search?.trim();
    const contains = (s: string) => ({ contains: s, mode: 'insensitive' as const });
    return {
      ...(q.module ? { module: q.module } : {}),
      ...(q.action ? { action: q.action } : {}),
      ...(q.actorId ? { actorId: q.actorId } : {}),
      ...(q.entityType ? { entityType: q.entityType } : {}),
      ...(q.entityId ? { entityId: q.entityId } : {}),
      ...(range ? { createdAt: { gte: range.from, lte: range.to } } : {}),
      ...(search
        ? { OR: [{ entityId: search }, { actor: { name: contains(search) } }, { actor: { email: contains(search) } }] }
        : {}),
    };
  }

  async list(q: ListAuditLogsQueryDto) {
    const where = this.where(q);
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({ where, include: AUDIT_LOG_INCLUDE, orderBy: { createdAt: 'desc' }, ...skipTake(q) }),
      this.prisma.auditLog.count({ where }),
    ]);
    return paginate(rows.map(toAuditLogItem), total, q);
  }

  async stats() {
    const today = startOfTodayVn();
    const weekAgo = new Date(Date.now() - 7 * 24 * 3600_000);
    const [actionsToday, actors, configChangesWeek, suspensionsWeek] = await Promise.all([
      this.prisma.auditLog.count({ where: { createdAt: { gte: today } } }),
      this.prisma.auditLog.groupBy({ by: ['actorId'], where: { createdAt: { gte: today }, actorId: { not: null } } }),
      this.prisma.auditLog.count({ where: { module: 'CONFIG', createdAt: { gte: weekAgo } } }),
      this.prisma.auditLog.count({ where: { action: 'USER_SUSPENDED', createdAt: { gte: weekAgo } } }),
    ]);
    return { actionsToday, activeActorsToday: actors.length, configChangesWeek, suspensionsWeek };
  }

  async exportCsv(q: ListAuditLogsQueryDto) {
    const rows = await this.prisma.auditLog.findMany({ where: this.where(q), include: AUDIT_LOG_INCLUDE, orderBy: { createdAt: 'desc' }, take: 10_000 });
    return toCsv(rows.map(toAuditLogItem), [
      { header: 'Thời gian', value: (r) => r.createdAt },
      { header: 'Người thực hiện', value: (r) => r.actor?.name ?? '' },
      { header: 'Email', value: (r) => r.actor?.email ?? '' },
      { header: 'Vai trò', value: (r) => r.actorRole },
      { header: 'Hành động', value: (r) => r.action },
      { header: 'Module', value: (r) => r.module },
      { header: 'Đối tượng', value: (r) => r.entityType },
      { header: 'ID đối tượng', value: (r) => r.entityId },
      { header: 'IP', value: (r) => r.ipAddress },
      { header: 'Trước', value: (r) => (r.before === null ? '' : JSON.stringify(r.before)) },
      { header: 'Sau', value: (r) => (r.after === null ? '' : JSON.stringify(r.after)) },
    ]);
  }
}
