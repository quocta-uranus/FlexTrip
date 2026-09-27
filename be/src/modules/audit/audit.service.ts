import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { RequestContext } from '../../common/request-context';
import { AUDIT_ACTIONS, AuditAction } from './audit-actions';

export interface AuditEntry {
  action: AuditAction;
  entityType: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
}

/** Decimal → string, Date → ISO; undefined stays undefined so the column is left NULL. */
export function auditJson(value: unknown): Prisma.InputJsonValue | undefined {
  return value === undefined ? undefined : (JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue);
}

@Injectable()
export class AuditService {
  async log(tx: Prisma.TransactionClient, ctx: RequestContext, entry: AuditEntry): Promise<void> {
    await tx.auditLog.create({
      data: {
        actorId: ctx.actorId,
        actorRole: ctx.actorRole,
        action: entry.action,
        module: AUDIT_ACTIONS[entry.action],
        entityType: entry.entityType,
        entityId: entry.entityId ?? null,
        before: auditJson(entry.before),
        after: auditJson(entry.after),
        ipAddress: ctx.ip,
        userAgent: ctx.userAgent,
      },
    });
  }
}
