import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { NotificationType, Prisma, TicketStatus, TicketTriageSource } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { paginate, skipTake } from '../../../common/dto/pagination.dto';
import { RequestContext } from '../../../common/request-context';
import { TicketTriageService } from '../../support/ticket-triage.service';
import {
  TICKET_DETAIL_INCLUDE, TICKET_LIST_INCLUDE, toTicketDetail, toTicketItem,
} from '../../support/ticket.view';
import { AdminReplyDto, ListTicketsQueryDto, UpdateTicketDto } from './dto/admin-support.dto';

const ACTIVE: TicketStatus[] = [TicketStatus.OPEN, TicketStatus.IN_PROGRESS, TicketStatus.WAITING_USER];

@Injectable()
export class AdminTicketsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly triage: TicketTriageService,
  ) {}

  async list(q: ListTicketsQueryDto) {
    const search = q.search?.trim();
    const contains = (s: string) => ({ contains: s, mode: 'insensitive' as const });
    const where: Prisma.SupportTicketWhereInput = {
      ...(q.status ? { status: q.status } : {}),
      ...(q.category ? { category: q.category } : {}),
      ...(q.priority ? { priority: q.priority } : {}),
      ...(search
        ? { OR: [{ id: search }, { subject: contains(search) }, { requester: { name: contains(search) } }, { requester: { email: contains(search) } }] }
        : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.supportTicket.findMany({
        where, include: TICKET_LIST_INCLUDE,
        orderBy: [{ priority: 'desc' }, { updatedAt: 'desc' }],
        ...skipTake(q),
      }),
      this.prisma.supportTicket.count({ where }),
    ]);
    return paginate(rows.map(toTicketItem), total, q);
  }

  async stats() {
    const [byStatus, byCategory, unassigned] = await Promise.all([
      this.prisma.supportTicket.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.supportTicket.groupBy({ by: ['category'], where: { status: { in: ACTIVE } }, _count: { _all: true } }),
      this.prisma.supportTicket.count({ where: { status: TicketStatus.OPEN, assignedToId: null } }),
    ]);
    const status = Object.fromEntries(Object.values(TicketStatus).map((s) => [s, 0])) as Record<TicketStatus, number>;
    for (const g of byStatus) status[g.status] = g._count._all;
    return {
      byStatus: status,
      activeByCategory: Object.fromEntries(byCategory.map((g) => [g.category, g._count._all])),
      unassigned,
    };
  }

  async detail(id: string) {
    const t = await this.prisma.supportTicket.findUnique({ where: { id }, include: TICKET_DETAIL_INCLUDE });
    if (!t) throw new NotFoundException({ code: 'TICKET_NOT_FOUND', message: 'Không tìm thấy ticket.' });
    return toTicketDetail(t);
  }

  async reply(id: string, dto: AdminReplyDto, ctx: RequestContext) {
    const nextStatus = dto.nextStatus ?? TicketStatus.WAITING_USER;
    await this.prisma.$transaction(async (tx) => {
      const ticket = await tx.supportTicket.findUnique({
        where: { id },
        select: { id: true, status: true, requesterId: true, subject: true, assignedToId: true },
      });
      if (!ticket) throw new NotFoundException({ code: 'TICKET_NOT_FOUND', message: 'Không tìm thấy ticket.' });
      if (ticket.status === TicketStatus.CLOSED)
        throw new ConflictException({ code: 'TICKET_CLOSED', message: 'Ticket đã đóng, không thể phản hồi.' });

      await tx.supportTicketMessage.create({
        data: { ticketId: id, authorId: ctx.actorId, isStaff: true, body: dto.body.trim() },
      });
      await tx.supportTicket.update({
        where: { id },
        data: {
          status: nextStatus,
          resolvedAt: nextStatus === TicketStatus.RESOLVED ? new Date() : null,
          assignedToId: ticket.assignedToId ?? ctx.actorId,
        },
      });
      await tx.notification.create({
        data: {
          userId: ticket.requesterId,
          type: NotificationType.SYSTEM,
          title: nextStatus === TicketStatus.RESOLVED ? 'Yêu cầu hỗ trợ đã được giải quyết' : 'Có phản hồi mới từ hỗ trợ',
          body: `Ticket "${ticket.subject}" vừa được FlexTrip phản hồi.`,
          data: { ticketId: id },
        },
      });
      await this.audit.log(tx, ctx, {
        action: 'TICKET_REPLIED', entityType: 'SupportTicket', entityId: id, after: { status: nextStatus },
      });
    });
    return this.detail(id);
  }

  async update(id: string, dto: UpdateTicketDto, ctx: RequestContext) {
    if (dto.status === undefined && dto.category === undefined && dto.priority === undefined && dto.assignToMe === undefined)
      throw new BadRequestException({ code: 'NOTHING_TO_UPDATE', message: 'Không có thay đổi nào.' });

    await this.prisma.$transaction(async (tx) => {
      const before = await tx.supportTicket.findUnique({
        where: { id },
        select: { status: true, category: true, priority: true, assignedToId: true },
      });
      if (!before) throw new NotFoundException({ code: 'TICKET_NOT_FOUND', message: 'Không tìm thấy ticket.' });

      const reclassified =
        (dto.category !== undefined && dto.category !== before.category) ||
        (dto.priority !== undefined && dto.priority !== before.priority);
      const data: Prisma.SupportTicketUncheckedUpdateInput = {
        ...(dto.status !== undefined ? { status: dto.status, resolvedAt: dto.status === TicketStatus.RESOLVED ? new Date() : null } : {}),
        ...(dto.category !== undefined ? { category: dto.category } : {}),
        ...(dto.priority !== undefined ? { priority: dto.priority } : {}),
        ...(dto.assignToMe !== undefined ? { assignedToId: dto.assignToMe ? ctx.actorId : null } : {}),
        ...(reclassified ? { triageSource: TicketTriageSource.ADMIN, triageReason: 'Admin điều chỉnh thủ công' } : {}),
      };
      await tx.supportTicket.update({ where: { id }, data });
      await this.audit.log(tx, ctx, {
        action: 'TICKET_UPDATED', entityType: 'SupportTicket', entityId: id,
        before, after: { status: dto.status, category: dto.category, priority: dto.priority, assignToMe: dto.assignToMe },
      });
    });
    return this.detail(id);
  }

  async retriage(id: string) {
    await this.triage.triage(id, true);
    return this.detail(id);
  }
}
