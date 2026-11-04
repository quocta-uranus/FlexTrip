import { InjectQueue } from '@nestjs/bullmq';
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TicketStatus } from '@prisma/client';
import { Queue } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { paginate, skipTake } from '../../common/dto/pagination.dto';
import { CreateTicketDto, ListMyTicketsQueryDto, TicketReplyDto } from './dto/support.dto';
import { SUPPORT_TRIAGE_QUEUE, SupportTriageJob, TRIAGE_TICKET_JOB } from './support.constants';
import { TICKET_DETAIL_INCLUDE, toRequesterView } from './ticket.view';

const ACTIVE: TicketStatus[] = [TicketStatus.OPEN, TicketStatus.IN_PROGRESS, TicketStatus.WAITING_USER];
export const MAX_ACTIVE_TICKETS = 5;

@Injectable()
export class SupportService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(SUPPORT_TRIAGE_QUEUE) private readonly triageQueue: Queue<SupportTriageJob>,
  ) {}

  async create(userId: string, dto: CreateTicketDto) {
    const active = await this.prisma.supportTicket.count({ where: { requesterId: userId, status: { in: ACTIVE } } });
    if (active >= MAX_ACTIVE_TICKETS)
      throw new ConflictException({
        code: 'TOO_MANY_ACTIVE_TICKETS',
        message: `Bạn đang có ${MAX_ACTIVE_TICKETS} ticket chưa xử lý xong. Vui lòng chờ phản hồi trước khi gửi thêm.`,
      });

    if (dto.bookingId) {
      const booking = await this.prisma.booking.findFirst({
        where: { id: dto.bookingId, OR: [{ travelerId: userId }, { listing: { providerId: userId } }] },
        select: { id: true },
      });
      if (!booking) throw new NotFoundException({ code: 'BOOKING_NOT_FOUND', message: 'Không tìm thấy booking liên quan.' });
    }

    const ticket = await this.prisma.supportTicket.create({
      data: {
        requesterId: userId,
        subject: dto.subject.trim(),
        description: dto.description.trim(),
        bookingId: dto.bookingId ?? null,
      },
      select: { id: true },
    });
    await this.triageQueue.add(
      TRIAGE_TICKET_JOB,
      { ticketId: ticket.id },
      { attempts: 3, backoff: { type: 'exponential', delay: 5_000 }, removeOnComplete: true },
    );
    return { id: ticket.id };
  }

  async listMine(userId: string, q: ListMyTicketsQueryDto) {
    const where: Prisma.SupportTicketWhereInput = { requesterId: userId, ...(q.status ? { status: q.status } : {}) };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.supportTicket.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true, subject: true, category: true, status: true, createdAt: true, updatedAt: true,
          _count: { select: { messages: true } },
        },
        ...skipTake(q),
      }),
      this.prisma.supportTicket.count({ where }),
    ]);
    const items = rows.map(({ _count, ...t }) => ({ ...t, messageCount: _count.messages }));
    return paginate(items, total, q);
  }

  async detail(userId: string, id: string) {
    const ticket = await this.prisma.supportTicket.findFirst({
      where: { id, requesterId: userId },
      include: TICKET_DETAIL_INCLUDE,
    });
    if (!ticket) throw new NotFoundException({ code: 'TICKET_NOT_FOUND', message: 'Không tìm thấy ticket.' });
    return toRequesterView(ticket);
  }

  async reply(userId: string, id: string, dto: TicketReplyDto) {
    const ticket = await this.prisma.supportTicket.findFirst({
      where: { id, requesterId: userId },
      select: { id: true, status: true },
    });
    if (!ticket) throw new NotFoundException({ code: 'TICKET_NOT_FOUND', message: 'Không tìm thấy ticket.' });
    if (ticket.status === TicketStatus.CLOSED)
      throw new ConflictException({ code: 'TICKET_CLOSED', message: 'Ticket đã đóng, vui lòng tạo ticket mới.' });

    // A user reply hands the ticket back to support, including one already marked resolved.
    const reopen = ticket.status === TicketStatus.WAITING_USER || ticket.status === TicketStatus.RESOLVED;
    await this.prisma.$transaction([
      this.prisma.supportTicketMessage.create({
        data: { ticketId: id, authorId: userId, isStaff: false, body: dto.body.trim() },
      }),
      this.prisma.supportTicket.update({
        where: { id },
        data: reopen ? { status: TicketStatus.OPEN, resolvedAt: null } : { updatedAt: new Date() },
      }),
    ]);
    return this.detail(userId, id);
  }

  async close(userId: string, id: string) {
    const result = await this.prisma.supportTicket.updateMany({
      where: { id, requesterId: userId, status: { not: TicketStatus.CLOSED } },
      data: { status: TicketStatus.CLOSED },
    });
    if (!result.count) throw new NotFoundException({ code: 'TICKET_NOT_FOUND', message: 'Không tìm thấy ticket hoặc ticket đã đóng.' });
    return this.detail(userId, id);
  }

  listFaqs() {
    return this.prisma.faqArticle.findMany({
      where: { isPublished: true },
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
      select: { id: true, question: true, answer: true, category: true },
    });
  }
}
