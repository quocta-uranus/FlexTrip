import { BookingStatus, Role } from '@prisma/client';
import { AuthHarness, resetDatabase } from '../../auth/__tests__/support/auth-harness';
import { createAdmin, createBooking, createListing, createUser, http } from './support/admin-fixtures';

describe('ADMIN-10 rules & assignment', () => {
  const h = new AuthHarness();
  beforeAll(() => h.open());
  afterAll(() => h.close());
  beforeEach(async () => { await resetDatabase(h.prisma); h.redis.clear(); });

  async function staff(name: string, code: string, isActive = true) {
    const u = await createUser(h, { roles: [Role.STAFF], name });
    await h.prisma.staffProfile.create({ data: { userId: u.id, employeeCode: code, regions: [], isActive } });
    return u;
  }

  async function setup() {
    const admin = await createAdmin(h);
    const hcm1 = await staff('HCM Một', 'S-1');
    const hcm2 = await staff('HCM Hai', 'S-2');
    const off = await staff('Nghỉ', 'S-3', false);
    const provider = await createUser(h, { roles: [Role.PROVIDER] });
    const t = await createUser(h, { name: 'Khách' });
    const hcmListing = await createListing(h, provider.id, { location: 'Quận 1, TP. Hồ Chí Minh' });
    const dlListing = await createListing(h, provider.id, { location: 'Đà Lạt, Lâm Đồng' });
    const hcmBooking = await createBooking(h, { travelerId: t.id, listingId: hcmListing.id, status: BookingStatus.CONFIRMED });
    const dlBooking = await createBooking(h, { travelerId: t.id, listingId: dlListing.id, status: BookingStatus.PENDING_APPROVAL });
    const done = await createBooking(h, { travelerId: t.id, listingId: hcmListing.id, status: BookingStatus.COMPLETED });
    return { admin, hcm1, hcm2, off, hcmBooking, dlBooking, done, api: http(h, admin.accessToken) };
  }

  it('rule CRUD with staff validation', async () => {
    const { api, hcm1, off } = await setup();
    const created = await api.post('/admin/staff-rules', { name: 'HCM chính', region: 'Hồ Chí Minh', staffId: hcm1.id, priority: 10 });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ region: 'Hồ Chí Minh', priority: 10, isActive: true, staff: { id: hcm1.id, employeeCode: 'S-1' } });
    expect((await api.post('/admin/staff-rules', { name: 'x', region: 'Hồ Chí Minh', staffId: off.id, priority: 1 })).body.code).toBe('STAFF_NOT_AVAILABLE');
    expect((await api.post('/admin/staff-rules', { name: 'x', region: 'Hồ Chí Minh', staffId: hcm1.id, priority: 101 })).status).toBe(400);
    const upd = await api.patch(`/admin/staff-rules/${created.body.id}`, { priority: 20 });
    expect(upd.body.priority).toBe(20);
    expect((await api.get('/admin/staff-rules')).body).toHaveLength(1);
    expect((await api.delete(`/admin/staff-rules/${created.body.id}`)).status).toBe(200);
    expect(await h.prisma.auditLog.count({ where: { module: 'STAFF' } })).toBe(3);
  });

  it('auto-assign picks highest-priority active rule, diacritics-insensitive', async () => {
    const { api, hcm1, hcm2, off, hcmBooking, dlBooking } = await setup();
    await api.post('/admin/staff-rules', { name: 'low', region: 'tp. ho chi minh', staffId: hcm1.id, priority: 1 });
    await api.post('/admin/staff-rules', { name: 'high', region: 'Hồ Chí Minh', staffId: hcm2.id, priority: 50 });
    await h.prisma.staffAssignmentRule.create({ data: { name: 'off', region: 'Hồ Chí Minh', staffId: off.id, priority: 99 } });

    const res = await api.post(`/admin/bookings/${hcmBooking.id}/auto-assign`);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ booking: { assignedStaff: { id: hcm2.id } }, rule: { name: 'high' } });
    expect((await api.post(`/admin/bookings/${dlBooking.id}/auto-assign`)).body.code).toBe('NO_MATCHING_RULE');
  });

  it('auto-assign still matches when the listing location has a double space', async () => {
    const { api, hcm1 } = await setup();
    const provider = await createUser(h, { roles: [Role.PROVIDER] });
    const t = await createUser(h, { name: 'Khách 2' });
    const listing = await createListing(h, provider.id, { location: 'Đà  Nẵng' });
    const booking = await createBooking(h, { travelerId: t.id, listingId: listing.id, status: BookingStatus.CONFIRMED });
    await api.post('/admin/staff-rules', { name: 'Đà Nẵng', region: 'Đà Nẵng', staffId: hcm1.id, priority: 5 });

    const res = await api.post(`/admin/bookings/${booking.id}/auto-assign`);
    expect(res.status).toBe(201);
    expect(res.body.booking.assignedStaff.id).toBe(hcm1.id);
  });

  it('manual assign/unassign and listing filters', async () => {
    const { api, hcm1, off, hcmBooking, done } = await setup();
    expect((await api.patch(`/admin/bookings/${hcmBooking.id}/assign`, { staffId: off.id })).body.code).toBe('STAFF_NOT_AVAILABLE');
    expect((await api.patch(`/admin/bookings/${done.id}/assign`, { staffId: hcm1.id })).body.code).toBe('BOOKING_NOT_ASSIGNABLE');
    const ok = await api.patch(`/admin/bookings/${hcmBooking.id}/assign`, { staffId: hcm1.id });
    expect(ok.body.assignedStaff).toMatchObject({ id: hcm1.id, name: 'HCM Một' });

    expect((await api.get('/admin/bookings?assigned=true')).body.total).toBe(1);
    expect((await api.get('/admin/bookings?assigned=false&status=PENDING_APPROVAL')).body.total).toBe(1);
    expect((await api.get(`/admin/bookings?search=${encodeURIComponent('Lâm')}`)).body.total).toBe(1);

    const noReason = await api.delete(`/admin/bookings/${hcmBooking.id}/assign`);
    expect(noReason.body.code).toBe('REASON_REQUIRED');
    const gone = await api.delete(`/admin/bookings/${hcmBooking.id}/assign?reason=${encodeURIComponent('Staff nghỉ đột xuất')}`);
    expect(gone.body.assignedStaff).toBeNull();
    expect(await h.prisma.auditLog.count({ where: { action: { in: ['BOOKING_STAFF_ASSIGNED', 'BOOKING_STAFF_UNASSIGNED'] } } })).toBe(2);
  });

  it('changing staff needs a reason and tells the previous staff', async () => {
    const { api, hcm1, hcm2, hcmBooking } = await setup();
    await api.patch(`/admin/bookings/${hcmBooking.id}/assign`, { staffId: hcm1.id });

    expect((await api.patch(`/admin/bookings/${hcmBooking.id}/assign`, { staffId: hcm2.id })).body.code).toBe('REASON_REQUIRED');
    const changed = await api.patch(`/admin/bookings/${hcmBooking.id}/assign`, { staffId: hcm2.id, reason: 'Sai khu vực' });
    expect(changed.body.assignedStaff).toMatchObject({ id: hcm2.id });

    const told = await h.prisma.notification.findMany({ where: { userId: hcm1.id, title: 'Bạn không còn phụ trách đơn thuê' } });
    expect(told).toHaveLength(1);
    expect(told[0].body).toContain('Sai khu vực');

    // Same staff again is a no-op: no duplicate notification, no new audit entry
    const audits = await h.prisma.auditLog.count({ where: { action: 'BOOKING_STAFF_ASSIGNED' } });
    await api.patch(`/admin/bookings/${hcmBooking.id}/assign`, { staffId: hcm2.id });
    expect(await h.prisma.auditLog.count({ where: { action: 'BOOKING_STAFF_ASSIGNED' } })).toBe(audits);
  });

  it('unassigning tells the previous staff', async () => {
    const { api, hcm1, hcmBooking } = await setup();
    await api.patch(`/admin/bookings/${hcmBooking.id}/assign`, { staffId: hcm1.id });
    await api.delete(`/admin/bookings/${hcmBooking.id}/assign?reason=${encodeURIComponent('Đơn gộp')}`);
    const told = await h.prisma.notification.findMany({ where: { userId: hcm1.id, title: 'Bạn không còn phụ trách đơn thuê' } });
    expect(told).toHaveLength(1);
    expect(told[0].body).toContain('Đơn gộp');
  });

  it('a handed-over booking can be reassigned but never left without staff', async () => {
    const { api, hcm1, hcm2, hcmBooking } = await setup();
    await api.patch(`/admin/bookings/${hcmBooking.id}/assign`, { staffId: hcm1.id });
    await h.prisma.booking.update({ where: { id: hcmBooking.id }, data: { status: BookingStatus.IN_PROGRESS, checkedInAt: new Date() } });

    const blocked = await api.delete(`/admin/bookings/${hcmBooking.id}/assign?reason=${encodeURIComponent('thử')}`);
    expect(blocked.status).toBe(409);
    expect(blocked.body.code).toBe('CANNOT_UNASSIGN_HANDED_OVER');
    expect((await h.prisma.booking.findUnique({ where: { id: hcmBooking.id } }))?.assignedStaffId).toBe(hcm1.id);

    const moved = await api.patch(`/admin/bookings/${hcmBooking.id}/assign`, { staffId: hcm2.id, reason: 'Staff nghỉ ốm' });
    expect(moved.body.assignedStaff).toMatchObject({ id: hcm2.id });
  });
});
