import { BookingStatus, Role } from '@prisma/client';
import { AuthHarness, resetDatabase } from '../../auth/__tests__/support/auth-harness';
import { createAdmin, createBooking, createListing, createUser, http } from './support/admin-fixtures';

describe('ADMIN-10 staff', () => {
  const h = new AuthHarness();
  beforeAll(() => h.open());
  afterAll(() => h.close());
  beforeEach(async () => { await resetDatabase(h.prisma); h.redis.clear(); });

  const body = { name: 'Lê Văn Staff', email: 'Staff@FlexTrip.vn', phone: '0901234567', password: 'Valid password 123!', regions: ['Hồ Chí Minh'] };

  it('creates staff with an employee code derived from uid and an admin-set password', async () => {
    const admin = await createAdmin(h);
    const res = await http(h, admin.accessToken).post('/admin/staff', body);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      staff: { name: 'Lê Văn Staff', email: 'staff@flextrip.vn', regions: ['Hồ Chí Minh'], isActive: true, passwordSet: true, openAssignments: 0 },
    });
    expect(res.body.staff.employeeCode).toBe(`STF-${res.body.staff.id.toUpperCase()}`);
    expect(h.resend.sendStaffInvite).not.toHaveBeenCalled();
    const login = await http(h).post('/auth/login', { email: body.email.toLowerCase(), password: body.password });
    expect(login.status).toBeLessThan(300);
    const roles = await h.prisma.userRole.findMany({ where: { userId: res.body.staff.id } });
    expect(roles.map((r) => r.role)).toEqual([Role.STAFF]);
    expect(await h.prisma.auditLog.count({ where: { action: 'STAFF_CREATED' } })).toBe(1);
  });

  it('rejects duplicates and invalid input', async () => {
    const admin = await createAdmin(h);
    const api = http(h, admin.accessToken);
    await api.post('/admin/staff', body);
    expect((await api.post('/admin/staff', body)).body.code).toBe('EMAIL_TAKEN');
    expect((await api.post('/admin/staff', { ...body, email: 'x@y.vn', password: 'short' })).status).toBe(400);
    expect((await api.post('/admin/staff', { ...body, email: 'x@y.vn', regions: [] })).status).toBe(400);
    expect((await api.post('/admin/staff', { ...body, email: 'x@y.vn', regions: ['Bình Dương'] })).status).toBe(400);
  });

  it('updates, deactivates, and returns stats', async () => {
    const admin = await createAdmin(h);
    const api = http(h, admin.accessToken);
    const { body: created } = await api.post('/admin/staff', body);
    const id = created.staff.id;
    const upd = await api.patch(`/admin/staff/${id}`, { regions: ['Hà Nội'], isActive: false });
    expect(upd.body).toMatchObject({ regions: ['Hà Nội'], isActive: false });
    expect((await api.get('/admin/staff?isActive=false')).body.total).toBe(1);
    expect((await api.get(`/admin/staff?region=${encodeURIComponent('Hà Nội')}`)).body.total).toBe(1);

    const provider = await createUser(h, { roles: [Role.PROVIDER] });
    const t = await createUser(h);
    const listing = await createListing(h, provider.id);
    await createBooking(h, { travelerId: t.id, listingId: listing.id, status: BookingStatus.CONFIRMED });
    expect((await api.get('/admin/staff/stats')).body).toEqual({ total: 1, active: 0, openAssignments: 0, unassignedBookings: 1 });
    expect((await api.patch(`/admin/staff/${provider.id}`, { isActive: true })).status).toBe(404);
  });
});
