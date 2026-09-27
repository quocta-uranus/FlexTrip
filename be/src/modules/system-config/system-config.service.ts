import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { RequestContext } from '../../common/request-context';
import { CONFIG_BY_KEY, CONFIG_GROUP_LABELS, CONFIG_REGISTRY, ConfigKey } from './config-registry';

export interface ConfigItemView {
  key: string; label: string; description: string; unit: string;
  min: number; max: number; step: number; default: number; value: number;
  updatedAt: Date | null; updatedBy: { id: string; name: string } | null;
}
export interface ConfigGroupView { group: string; label: string; items: ConfigItemView[] }

@Injectable()
export class SystemConfigService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  async get(key: ConfigKey): Promise<number> {
    const row = await this.prisma.systemConfig.findUnique({ where: { key } });
    return row ? (row.value as number) : CONFIG_BY_KEY.get(key)!.default;
  }

  async getAll(): Promise<ConfigGroupView[]> {
    const rows = await this.prisma.systemConfig.findMany({
      include: { updatedBy: { select: { id: true, name: true } } },
    });
    const byKey = new Map(rows.map((r) => [r.key, r]));
    const groups = new Map<string, ConfigGroupView>();
    for (const def of CONFIG_REGISTRY) {
      const row = byKey.get(def.key);
      const group = groups.get(def.group) ?? { group: def.group, label: CONFIG_GROUP_LABELS[def.group], items: [] };
      group.items.push({
        key: def.key, label: def.label, description: def.description, unit: def.unit,
        min: def.min, max: def.max, step: def.step, default: def.default,
        value: row ? (row.value as number) : def.default,
        updatedAt: row?.updatedAt ?? null,
        updatedBy: row?.updatedBy ?? null,
      });
      groups.set(def.group, group);
    }
    return [...groups.values()];
  }

  /** `values` is already validated by @IsConfigValues on the DTO. */
  async update(values: Record<string, number>, ctx: RequestContext): Promise<ConfigGroupView[]> {
    await this.prisma.$transaction(async (tx) => {
      for (const [key, value] of Object.entries(values)) {
        const current = await tx.systemConfig.findUnique({ where: { key } });
        const before = current ? (current.value as number) : CONFIG_BY_KEY.get(key)!.default;
        if (before === value) continue;
        await tx.systemConfig.upsert({
          where: { key },
          create: { key, value, updatedById: ctx.actorId },
          update: { value, updatedById: ctx.actorId },
        });
        await this.audit.log(tx, ctx, {
          action: 'CONFIG_UPDATED', entityType: 'SystemConfig', entityId: key,
          before: { value: before }, after: { value },
        });
      }
    });
    return this.getAll();
  }

  async reset(keys: string[] | undefined, ctx: RequestContext): Promise<ConfigGroupView[]> {
    await this.prisma.$transaction(async (tx) => {
      const where: Prisma.SystemConfigWhereInput = keys?.length ? { key: { in: keys } } : {};
      const removed = await tx.systemConfig.findMany({ where });
      await tx.systemConfig.deleteMany({ where });
      await this.audit.log(tx, ctx, {
        action: 'CONFIG_RESET', entityType: 'SystemConfig', entityId: null,
        before: Object.fromEntries(removed.map((r) => [r.key, r.value])),
        after: { keys: keys ?? 'ALL' },
      });
    });
    return this.getAll();
  }
}
