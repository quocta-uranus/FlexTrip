import { Prisma } from '@prisma/client';

export const AUDIT_LOG_INCLUDE = {
  actor: { select: { id: true, name: true, email: true } },
} satisfies Prisma.AuditLogInclude;

type AuditLogRow = Prisma.AuditLogGetPayload<{ include: typeof AUDIT_LOG_INCLUDE }>;

export function toAuditLogItem(l: AuditLogRow) {
  return {
    id: l.id, createdAt: l.createdAt, actor: l.actor, actorRole: l.actorRole, action: l.action,
    module: l.module, entityType: l.entityType, entityId: l.entityId, before: l.before, after: l.after,
    ipAddress: l.ipAddress,
  };
}
export type AuditLogItem = ReturnType<typeof toAuditLogItem>;
