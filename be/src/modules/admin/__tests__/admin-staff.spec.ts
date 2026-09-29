import { BookingStatus, Role } from '@prisma/client';
import { AuthHarness, resetDatabase } from '../../auth/__tests__/support/auth-harness';
import { createAdmin, createBooking, createListing, createUser, http } from './support/admin-fixtures';

describe('ADMIN-10 staff', () => {
  const h = new AuthHarness();
  beforeAll(() => h.open());
  afterAll(() => h.close());
  beforeEach(async () => { await resetDatabase(h.prisma); h.redis.clear(); h.resend.sendStaffInvite.mockClear(); });

  const body = { name: 'Lê Văn Staff', email: 'Staff@FlexTrip.vn', phone: '0901234567', employeeCode: 'EMP-OP-001', regions: ['TP.HCM', 'Bình Dương'] };

  it('creates staff, sends invite, and the invite token sets a password', async () => {
    const admin = await createAdmin(h);
    const res = await http(h, admin.accessToken).post('/admin/staff', body);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      emailSent: true,
      staff: { name: 'Lê Văn Staff', email: 'staff@flextrip.vn', employeeCode: 'EMP-OP-001', regions: ['TP.HCM', 'Bình Dương'], isActive: true, passwordSet: false, openAssignments: 0 },
    });
    const [, , setupUrl] = h.resend.sendStaffInvite.mock.calls[0];
    const token = new URL(setupUrl).searchParams.get('token')!;
    const setup = await http(h).post('/auth/setup-password', { token, password: 'Valid password 123!' });
    expect(setup.status).toBeLessThan(300);
    const list = await http(h, admin.accessToken).get('/admin/staff');
    expect(list.body.items[0].passwordSet).toBe(true);
    const roles = await h.prisma.userRole.findMany({ where: { userId: res.body.staff.id } });
    expect(roles.map((r) => r.role)).toEqual([Role.STAFF]);
    expect(await h.prisma.auditLog.count({ where: { action: 'STAFF_CREATED' } })).toBe(1);
  });

  it('rejects duplicates and invalid input', async () => {
    const admin = await createAdmin(h);
    const api = http(h, admin.accessToken);
    await api.post('/admin/staff', body);
    expect((await api.post('/admin/staff', body)).body.code).toBe('EMAIL_TAKEN');
    expect((await api.post('/admin/staff', { ...body, email: 'other@flextrip.vn' })).body.code).toBe('EMPLOYEE_CODE_TAKEN');
    expect((await api.post('/admin/staff', { ...body, email: 'x@y.vn', employeeCode: 'emp 1' })).status).toBe(400);
    expect((await api.post('/admin/staff', { ...body, email: 'x@y.vn', employeeCode: 'EMP-2', regions: [] })).status).toBe(400);
  });

  it('updates, deactivates, resends invite; stats', async () => {
    const admin = await createAdmin(h);
    const api = http(h, admin.accessToken);
    const { body: created } = await api.post('/admin/staff', body);
    const id = created.staff.id;
    const upd = await api.patch(`/admin/staff/${id}`, { regions: ['Hà Nội'], isActive: false });
    expect(upd.body).toMatchObject({ regions: ['Hà Nội'], isActive: false });
    expect((await api.get('/admin/staff?isActive=false')).body.total).toBe(1);
    expect((await api.get(`/admin/staff?region=${encodeURIComponent('Hà Nội')}`)).body.total).toBe(1);

    const resend = await api.post(`/admin/staff/${id}/resend-invite`);
    expect(resend.body).toEqual({ emailSent: true });
    expect(h.resend.sendStaffInvite).toHaveBeenCalledTimes(2);

    const provider = await createUser(h, { roles: [Role.PROVIDER] });
    const t = await createUser(h);
    const listing = await createListing(h, provider.id);
    await createBooking(h, { travelerId: t.id, listingId: listing.id, status: BookingStatus.CONFIRMED });
    expect((await api.get('/admin/staff/stats')).body).toEqual({ total: 1, active: 0, openAssignments: 0, unassignedBookings: 1 });
    expect((await api.patch(`/admin/staff/${provider.id}`, { isActive: true })).status).toBe(404);
  });
});
