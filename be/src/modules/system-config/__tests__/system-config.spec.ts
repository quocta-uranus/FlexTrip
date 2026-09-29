import { Role } from '@prisma/client';
import { AuthHarness, resetDatabase } from '../../auth/__tests__/support/auth-harness';
import { createAdmin } from '../../admin/__tests__/support/admin-fixtures';
import { SystemConfigService } from '../system-config.service';
import { validateConfigValues } from '../config-registry';

describe('SystemConfigService', () => {
  const h = new AuthHarness();
  let svc: SystemConfigService;
  beforeAll(async () => { await h.open(); svc = h.app.get(SystemConfigService); });
  afterAll(() => h.close());
  beforeEach(() => resetDatabase(h.prisma));

  const ctx = (id: string) => ({ actorId: id, actorRole: Role.ADMIN, ip: null, userAgent: null });

  it('validateConfigValues rejects unknown keys, out-of-range and non-integers', () => {
    expect(validateConfigValues({ platform_fee: 12 })).toEqual([]);
    expect(validateConfigValues({ nope: 1 })).toEqual(['nope: unknown key']);
    expect(validateConfigValues({ platform_fee: 30 })).toEqual(['platform_fee: must be between 1 and 25']);
    expect(validateConfigValues({ velocity_limit: 2.5 })).toEqual(['velocity_limit: must be an integer']);
    expect(validateConfigValues({ platform_fee: '10' })).toEqual(['platform_fee: must be a number']);
  });

  it('returns defaults when nothing stored', async () => {
    expect(await svc.get('platform_fee')).toBe(10);
    const groups = await svc.getAll();
    expect(groups.map((g) => g.group)).toEqual(['fraud', 'moderation', 'policies', 'commission']);
    expect(groups.flatMap((g) => g.items)).toHaveLength(12);
  });

  it('update stores values and audits only changed keys', async () => {
    const admin = await createAdmin(h);
    await svc.update({ platform_fee: 12, cancel_window: 7 }, ctx(admin.id)); // cancel_window = default → unchanged
    expect(await svc.get('platform_fee')).toBe(12);
    const logs = await h.prisma.auditLog.findMany({ where: { action: 'CONFIG_UPDATED' } });
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({ entityId: 'platform_fee', before: { value: 10 }, after: { value: 12 } });
  });

  it('reset removes stored overrides', async () => {
    const admin = await createAdmin(h);
    await svc.update({ platform_fee: 12, min_payout: 200000 }, ctx(admin.id));
    await svc.reset(['platform_fee'], ctx(admin.id));
    expect(await svc.get('platform_fee')).toBe(10);
    expect(await svc.get('min_payout')).toBe(200000);
    await svc.reset(undefined, ctx(admin.id));
    expect(await svc.get('min_payout')).toBe(100000);
    expect(await h.prisma.auditLog.count({ where: { action: 'CONFIG_RESET' } })).toBe(2);
  });
});
