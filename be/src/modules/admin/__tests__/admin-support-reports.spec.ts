import { jest } from '@jest/globals';
import { PaymentStatus, Role, TicketCategory } from '@prisma/client';
import { AuthHarness, resetDatabase } from '../../auth/__tests__/support/auth-harness';
import { GroqJsonService } from '../../support/groq-json.service';
import { TicketTriageService } from '../../support/ticket-triage.service';
import { AdminReportSchedulesService } from '../reports/admin-report-schedules.service';
import { createAdmin, createBooking, createListing, createUser, http } from './support/admin-fixtures';

describe('SUPPORT-01..04 and REPORT-01..02', () => {
  const h = new AuthHarness();
  beforeAll(async () => {
    await h.open();
    // Force the rule-based path so tests never reach the network.
    jest.spyOn(h.app.get(GroqJsonService), 'complete').mockResolvedValue(null);
  });
  afterAll(() => h.close());
  beforeEach(async () => {
    await resetDatabase(h.prisma);
    h.redis.clear();
    h.supportQueue.add.mockClear();
    h.resend.sendReport.mockClear();
  });

  const ticketBody = { subject: 'Chưa được hoàn tiền cọc', description: 'Tôi huỷ đơn 3 ngày rồi mà chưa nhận lại tiền.' };

  describe('tickets', () => {
    it('creates a ticket, queues triage, and only the owner can read it', async () => {
      const owner = await createUser(h);
      const other = await createUser(h);
      const res = await http(h, owner.accessToken).post('/support/tickets', ticketBody);
      expect(res.status).toBe(201);
      expect(h.supportQueue.add).toHaveBeenCalledWith('triage-ticket', { ticketId: res.body.id }, expect.anything());

      expect((await http(h, owner.accessToken).get(`/support/tickets/${res.body.id}`)).body).toMatchObject({
        subject: ticketBody.subject, status: 'OPEN', category: 'OTHER',
      });
      expect((await http(h, other.accessToken).get(`/support/tickets/${res.body.id}`)).status).toBe(404);
    });

    it('rejects a booking the requester is not part of', async () => {
      const provider = await createUser(h, { roles: [Role.PROVIDER] });
      const traveler = await createUser(h);
      const stranger = await createUser(h);
      const booking = await createBooking(h, { travelerId: traveler.id, listingId: (await createListing(h, provider.id)).id });
      const res = await http(h, stranger.accessToken).post('/support/tickets', { ...ticketBody, bookingId: booking.id });
      expect(res.body.code).toBe('BOOKING_NOT_FOUND');
      expect((await http(h, provider.accessToken).post('/support/tickets', { ...ticketBody, bookingId: booking.id })).status).toBe(201);
    });

    it('caps the number of unresolved tickets per user', async () => {
      const user = await createUser(h);
      const api = http(h, user.accessToken);
      for (let i = 0; i < 5; i++) expect((await api.post('/support/tickets', ticketBody)).status).toBe(201);
      expect((await api.post('/support/tickets', ticketBody)).body.code).toBe('TOO_MANY_ACTIVE_TICKETS');
    });

    it('is closed to admins on the user endpoints and to travelers on the admin endpoints', async () => {
      const admin = await createAdmin(h);
      const user = await createUser(h);
      expect((await http(h, admin.accessToken).post('/support/tickets', ticketBody)).status).toBe(403);
      expect((await http(h, user.accessToken).get('/admin/support/tickets')).status).toBe(403);
    });

    it('triage fills category and priority, but never overwrites an admin decision', async () => {
      const admin = await createAdmin(h);
      const user = await createUser(h);
      const { body } = await http(h, user.accessToken).post('/support/tickets', ticketBody);
      const triage = h.app.get(TicketTriageService);

      await triage.triage(body.id);
      expect(await h.prisma.supportTicket.findUnique({ where: { id: body.id } })).toMatchObject({
        category: 'PAYMENT', priority: 'HIGH', triageSource: 'RULES',
      });

      await http(h, admin.accessToken).patch(`/admin/support/tickets/${body.id}`, { category: 'BOOKING', priority: 'LOW' });
      await triage.triage(body.id);
      expect(await h.prisma.supportTicket.findUnique({ where: { id: body.id } })).toMatchObject({
        category: 'BOOKING', priority: 'LOW', triageSource: 'ADMIN',
      });

      await http(h, admin.accessToken).post(`/admin/support/tickets/${body.id}/retriage`);
      expect(await h.prisma.supportTicket.findUnique({ where: { id: body.id } })).toMatchObject({ category: 'PAYMENT', triageSource: 'RULES' });
    });

    it('admin reply waits on the user and notifies; a user reply reopens; closed rejects replies', async () => {
      const admin = await createAdmin(h);
      const user = await createUser(h);
      const { body } = await http(h, user.accessToken).post('/support/tickets', ticketBody);
      const adminApi = http(h, admin.accessToken);
      const userApi = http(h, user.accessToken);

      const replied = await adminApi.post(`/admin/support/tickets/${body.id}/messages`, { body: 'Đã hoàn tiền, vui lòng kiểm tra ví.' });
      expect(replied.body).toMatchObject({ status: 'WAITING_USER', assignedTo: { id: admin.id } });
      const note = await h.prisma.notification.findFirstOrThrow({ where: { userId: user.id, type: 'SYSTEM' } });
      expect(note.data).toEqual({ ticketId: body.id });

      const asUser = await userApi.get(`/support/tickets/${body.id}`);
      expect(asUser.body.messages[0]).toMatchObject({ isStaff: true, authorName: 'Hỗ trợ FlexTrip' });
      expect(asUser.body.priority).toBeUndefined();

      await adminApi.post(`/admin/support/tickets/${body.id}/messages`, { body: 'Đã xử lý xong.', nextStatus: 'RESOLVED' });
      expect((await userApi.post(`/support/tickets/${body.id}/messages`, { body: 'Chưa thấy tiền' })).body.status).toBe('OPEN');

      await userApi.patch(`/support/tickets/${body.id}/close`);
      expect((await userApi.post(`/support/tickets/${body.id}/messages`, { body: 'Thêm' })).body.code).toBe('TICKET_CLOSED');
      expect((await adminApi.post(`/admin/support/tickets/${body.id}/messages`, { body: 'Thêm' })).body.code).toBe('TICKET_CLOSED');
    });

    it('lists with filters and reports stats', async () => {
      const admin = await createAdmin(h);
      const user = await createUser(h);
      const { body } = await http(h, user.accessToken).post('/support/tickets', ticketBody);
      await h.app.get(TicketTriageService).triage(body.id);
      const api = http(h, admin.accessToken);
      expect((await api.get('/admin/support/tickets?category=PAYMENT')).body.total).toBe(1);
      expect((await api.get('/admin/support/tickets?category=ACCOUNT')).body.total).toBe(0);
      expect((await api.get(`/admin/support/tickets?search=${encodeURIComponent(user.email)}`)).body.total).toBe(1);
      expect((await api.get('/admin/support/tickets/stats')).body).toMatchObject({ byStatus: { OPEN: 1 }, unassigned: 1 });
    });
  });

  describe('FAQ', () => {
    it('admin CRUD; the public list only shows published entries; audit is written', async () => {
      const admin = await createAdmin(h);
      const api = http(h, admin.accessToken);
      const shown = await api.post('/admin/support/faqs', { question: 'Hoàn tiền cọc mất bao lâu?', answer: 'Trong 1-3 ngày làm việc.', category: 'PAYMENT' });
      await api.post('/admin/support/faqs', { question: 'Bản nháp chưa công bố', answer: 'Nội dung nháp.', category: 'OTHER', isPublished: false });
      expect(shown.status).toBe(201);

      const publicList = await http(h).get('/support/faqs');
      expect(publicList.body.map((f: { question: string }) => f.question)).toEqual(['Hoàn tiền cọc mất bao lâu?']);

      await api.patch(`/admin/support/faqs/${shown.body.id}`, { isPublished: false });
      expect((await http(h).get('/support/faqs')).body).toHaveLength(0);
      expect((await api.delete(`/admin/support/faqs/${shown.body.id}`)).status).toBe(200);
      expect((await api.delete(`/admin/support/faqs/${shown.body.id}`)).body.code).toBe('FAQ_NOT_FOUND');

      const actions = (await h.prisma.auditLog.findMany({ where: { module: 'SUPPORT' }, orderBy: { createdAt: 'asc' } })).map((l) => l.action);
      expect(actions).toEqual(['FAQ_CREATED', 'FAQ_CREATED', 'FAQ_UPDATED', 'FAQ_DELETED']);
    });

    it('suggests an entry for a repeated, uncovered topic and skips topics an FAQ already answers', async () => {
      const admin = await createAdmin(h);
      const user = await createUser(h);
      const subjects = ['Hoàn tiền cọc bao lâu', 'Bao lâu thì được hoàn tiền cọc', 'Hoàn tiền cọc khi nào'];
      for (const subject of subjects) {
        await h.prisma.supportTicket.create({
          data: { requesterId: user.id, subject, description: 'x'.repeat(20), category: TicketCategory.PAYMENT },
        });
      }
      const api = http(h, admin.accessToken);
      const first = await api.get('/admin/support/faqs/suggestions');
      expect(first.body).toHaveLength(1);
      expect(first.body[0]).toMatchObject({ category: 'PAYMENT', ticketCount: 3, source: 'RULES' });

      await api.post('/admin/support/faqs', { question: 'Hoàn tiền cọc mất bao lâu?', answer: 'Trong 1-3 ngày.', category: 'PAYMENT' });
      expect((await api.get('/admin/support/faqs/suggestions')).body).toHaveLength(0);
    });
  });

  describe('reports', () => {
    async function seedPaid() {
      const provider = await createUser(h, { roles: [Role.PROVIDER] });
      const traveler = await createUser(h);
      const listing = await createListing(h, provider.id);
      const createdAt = new Date('2026-09-10T05:00:00Z');
      await createBooking(h, { travelerId: traveler.id, listingId: listing.id, totalPrice: 1_000_000, createdAt, payment: { amount: 1_000_000, platformFee: 100_000, status: PaymentStatus.PAID, createdAt } });
      await createBooking(h, { travelerId: traveler.id, listingId: listing.id, totalPrice: 500_000, createdAt, payment: { amount: 500_000, platformFee: 50_000, status: PaymentStatus.PAID, createdAt } });
      return { admin: await createAdmin(h) };
    }

    it('exports revenue per day with a total row, and writes an audit entry', async () => {
      const { admin } = await seedPaid();
      const res = await http(h, admin.accessToken).get('/admin/reports/export?type=REVENUE&from=2026-09-01&to=2026-09-30');
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      const lines = res.text.replace(/^﻿/, '').trim().split('\r\n');
      expect(lines[1]).toBe('2026-09-10,2,1500000,150000,0');
      expect(lines[2]).toBe('Tổng,2,1500000,150000,0');
      expect(await h.prisma.auditLog.count({ where: { action: 'REPORT_EXPORTED' } })).toBe(1);
    });

    it('exports bookings and rejects invalid ranges', async () => {
      const { admin } = await seedPaid();
      const api = http(h, admin.accessToken);
      const res = await api.get('/admin/reports/export?type=BOOKINGS&from=2026-09-01&to=2026-09-30');
      expect(res.text.trim().split('\r\n')).toHaveLength(3);
      // The forced text/csv header stays on error responses, so read the JSON from the raw text.
      const code = async (path: string) => JSON.parse((await api.get(path)).text).code;
      expect(await code('/admin/reports/export?type=BOOKINGS&from=2026-09-30&to=2026-09-01')).toBe('INVALID_RANGE');
      expect(await code('/admin/reports/export?type=BOOKINGS&from=2024-01-01&to=2026-09-01')).toBe('RANGE_TOO_LARGE');
      expect((await api.get('/admin/reports/export?type=NOPE&from=2026-09-01&to=2026-09-30')).status).toBe(400);
    });

    it('a due schedule emails the CSV once, then moves to the next slot; paused ones stay quiet', async () => {
      const { admin } = await seedPaid();
      const api = http(h, admin.accessToken);
      const created = await api.post('/admin/reports/schedules', {
        name: 'Doanh thu tuần', type: 'REVENUE', frequency: 'WEEKLY', recipients: ['Boss@Example.test', 'boss@example.test'],
      });
      expect(created.status).toBe(201);
      expect(created.body.recipients).toEqual(['boss@example.test']);
      expect(new Date(created.body.nextRunAt).getTime()).toBeGreaterThan(Date.now());

      const svc = h.app.get(AdminReportSchedulesService);
      expect(await svc.runDue()).toBe(0);

      await h.prisma.reportSchedule.update({ where: { id: created.body.id }, data: { nextRunAt: new Date(Date.now() - 1000) } });
      expect(await svc.runDue()).toBe(1);
      expect(await svc.runDue()).toBe(0);
      expect(h.resend.sendReport).toHaveBeenCalledTimes(1);
      expect(h.resend.sendReport.mock.calls[0][0]).toEqual(['boss@example.test']);
      expect(h.resend.sendReport.mock.calls[0][3].filename).toMatch(/^bao-cao-revenue-/);
      const after = await h.prisma.reportSchedule.findUniqueOrThrow({ where: { id: created.body.id } });
      expect(after.lastError).toBeNull();
      expect(after.nextRunAt.getTime()).toBeGreaterThan(Date.now());

      await api.patch(`/admin/reports/schedules/${created.body.id}`, { isActive: false });
      await h.prisma.reportSchedule.update({ where: { id: created.body.id }, data: { nextRunAt: new Date(Date.now() - 1000) } });
      expect(await svc.runDue()).toBe(0);
    });

    it('records the failure when the mail provider rejects, and runNow does not move the schedule', async () => {
      const { admin } = await seedPaid();
      const api = http(h, admin.accessToken);
      const created = await api.post('/admin/reports/schedules', { name: 'HH tháng', type: 'COMMISSION', frequency: 'MONTHLY', recipients: ['a@example.test'] });
      h.resend.sendReport.mockResolvedValueOnce(false);
      expect((await api.post(`/admin/reports/schedules/${created.body.id}/run`)).body).toEqual({ sent: false });
      const failed = await h.prisma.reportSchedule.findUniqueOrThrow({ where: { id: created.body.id } });
      expect(failed.lastError).toBe('Gửi email thất bại');
      expect(failed.nextRunAt.toISOString()).toBe(new Date(created.body.nextRunAt).toISOString());

      expect((await api.post(`/admin/reports/schedules/${created.body.id}/run`)).body).toEqual({ sent: true });
      expect((await h.prisma.reportSchedule.findUniqueOrThrow({ where: { id: created.body.id } })).lastError).toBeNull();
    });

    it('validates recipients', async () => {
      const { admin } = await seedPaid();
      const res = await http(h, admin.accessToken).post('/admin/reports/schedules', { name: 'Bad', type: 'REVENUE', frequency: 'WEEKLY', recipients: ['not-an-email'] });
      expect(res.status).toBe(400);
    });
  });
});
