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
    const dlBooking = await createBooking(h, { travelerId: t.id, listingId: dlListing.id, status: BookingStatus.PENDING });
    const done = await createBooking(h, { travelerId: t.id, listingId: hcmListing.id, status: BookingStatus.COMPLETED });
    return { admin, hcm1, hcm2, off, hcmBooking, dlBooking, done, api: http(h, admin.accessToken) };
  }

  it('rule CRUD with staff validation', async () => {
    const { api, hcm1, off } = await setup();
    const created = await api.post('/admin/staff-rules', { name: 'HCM chính', region: 'Hồ Chí Minh', staffId: hcm1.id, priority: 10 });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ region: 'Hồ Chí Minh', priority: 10, isActive: true, staff: { id: hcm1.id, employeeCode: 'S-1' } });
    expect((await api.post('/admin/staff-rules', { name: 'x', region: 'x', staffId: off.id, priority: 1 })).body.code).toBe('STAFF_NOT_AVAILABLE');
    expect((await api.post('/admin/staff-rules', { name: 'x', region: 'x', staffId: hcm1.id, priority: 101 })).status).toBe(400);
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

  it('manual assign/unassign and listing filters', async () => {
    const { api, hcm1, off, hcmBooking, done } = await setup();
    expect((await api.patch(`/admin/bookings/${hcmBooking.id}/assign`, { staffId: off.id })).body.code).toBe('STAFF_NOT_AVAILABLE');
    expect((await api.patch(`/admin/bookings/${done.id}/assign`, { staffId: hcm1.id })).body.code).toBe('BOOKING_NOT_ASSIGNABLE');
    const ok = await api.patch(`/admin/bookings/${hcmBooking.id}/assign`, { staffId: hcm1.id });
    expect(ok.body.assignedStaff).toMatchObject({ id: hcm1.id, name: 'HCM Một' });

    expect((await api.get('/admin/bookings?assigned=true')).body.total).toBe(1);
    expect((await api.get('/admin/bookings?assigned=false&status=PENDING')).body.total).toBe(1);
    expect((await api.get(`/admin/bookings?search=${encodeURIComponent('Lâm')}`)).body.total).toBe(1);

    expect((await api.delete(`/admin/bookings/${hcmBooking.id}/assign`)).body.assignedStaff).toBeNull();
    expect(await h.prisma.auditLog.count({ where: { action: { in: ['BOOKING_STAFF_ASSIGNED', 'BOOKING_STAFF_UNASSIGNED'] } } })).toBe(2);
  });
});
