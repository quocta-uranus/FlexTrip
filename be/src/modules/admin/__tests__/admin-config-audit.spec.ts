import { AuthHarness, resetDatabase } from '../../auth/__tests__/support/auth-harness';
import { createAdmin, createUser, http } from './support/admin-fixtures';

describe('ADMIN-08 config & ADMIN-09 audit logs', () => {
  const h = new AuthHarness();
  beforeAll(() => h.open());
  afterAll(() => h.close());
  beforeEach(async () => { await resetDatabase(h.prisma); h.redis.clear(); });

  it('config get/put/reset', async () => {
    const admin = await createAdmin(h);
    const api = http(h, admin.accessToken);
    const get = await api.get('/admin/config');
    expect(get.body).toHaveLength(5);
    const put = await api.put('/admin/config', { values: { platform_fee: 12.5, cancel_window: 5 } });
    expect(put.status).toBe(200);
    const items = put.body.flatMap((g: { items: { key: string; value: number; updatedBy: { id: string } | null }[] }) => g.items);
    expect(items.find((i: { key: string }) => i.key === 'platform_fee')).toMatchObject({ value: 12.5, updatedBy: { id: admin.id } });

    const bad = await api.put('/admin/config', { values: { platform_fee: 99, hacker: 1 } });
    expect(bad.status).toBe(400);
    expect(JSON.stringify(bad.body.message)).toContain('platform_fee: must be between 1 and 25');
    expect((await api.put('/admin/config', { values: {} })).status).toBe(400);
    expect((await api.post('/admin/config/reset', { keys: ['nope'] })).status).toBe(400);
    expect((await api.post('/admin/config/reset', { keys: ['platform_fee'] })).status).toBe(200);
  });

  it('audit logs: filter, search, stats, export; no write routes', async () => {
    const admin = await createAdmin(h, 'Trần Quốc Bảo');
    const target = await createUser(h);
    const api = http(h, admin.accessToken);
    await api.patch(`/admin/users/${target.id}/suspend`, { reason: 'x' });
    await api.put('/admin/config', { values: { platform_fee: 11 } });

    const all = await api.get('/admin/audit-logs');
    expect(all.body.total).toBe(2);
    expect(all.body.items[0]).toMatchObject({ action: 'CONFIG_UPDATED', module: 'CONFIG', actor: { name: 'Trần Quốc Bảo' } });
    expect((await api.get('/admin/audit-logs?module=USER')).body.total).toBe(1);
    expect((await api.get('/admin/audit-logs?action=USER_SUSPENDED')).body.items[0].entityId).toBe(target.id);
    expect((await api.get(`/admin/audit-logs?search=${encodeURIComponent('quốc bảo')}`)).body.total).toBe(2);
    expect((await api.get(`/admin/audit-logs?entityType=User&entityId=${target.id}`)).body.total).toBe(1);
    expect((await api.get('/admin/audit-logs?module=HACK')).status).toBe(400);

    expect((await api.get('/admin/audit-logs/stats')).body).toEqual({
      actionsToday: 2, activeActorsToday: 1, configChangesWeek: 1, suspensionsWeek: 1,
    });
    const csv = await api.get('/admin/audit-logs/export?module=USER');
    expect(csv.text.slice(1).trim().split('\r\n')).toHaveLength(2);

    const any = (await api.get('/admin/audit-logs')).body.items[0].id;
    expect((await api.delete(`/admin/audit-logs/${any}`)).status).toBe(404);
    expect((await api.patch(`/admin/audit-logs/${any}`, {})).status).toBe(404);
  });
});
