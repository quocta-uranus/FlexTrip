import { ProviderApplicationsService } from './provider-applications.service';

const ctx = {} as never;

function setup() {
  const notifications: Array<{ userId: string; type: string; title: string; body: string; data: unknown }> = [];
  const tx = {
    providerApplication: { update: async ({ data }: { data: Record<string, unknown> }) => ({ ...data }) },
  };
  const findFirstArgs: unknown[] = [];
  const prisma = {
    providerApplication: {
      findUnique: async () => ({ id: 'a1', status: 'PENDING', email: 'Dat@Example.com', name: 'Đạt', city: 'Đà Nẵng', categories: ['CAMPING'] }),
      findFirst: async (args: unknown) => { findFirstArgs.push(args); return null; },
    },
    user: {
      findUnique: async () => ({ id: 'u1', email: 'dat@example.com' }),
      findFirst: async () => applicant,
    },
    userRole: { findUnique: async () => ({}), upsert: async () => ({}) },
    providerSetupToken: { upsert: async () => ({}) },
    notification: { create: async ({ data }: { data: (typeof notifications)[number] }) => { notifications.push(data); return data; } },
    $transaction: async (fn: (t: typeof tx) => unknown) => fn(tx),
  };
  let applicant: { id: string } | null = { id: 'u1' };
  const resend = { sendProviderApproved: async () => undefined };
  const audit = { log: async () => undefined };
  const service = new ProviderApplicationsService(prisma as never, resend as never, {} as never, audit as never);
  return { service, notifications, findFirstArgs, setApplicant: (a: { id: string } | null) => { applicant = a; } };
}

describe('ProviderApplicationsService notifications and own application', () => {
  it('tells the applicant in the app when the application is approved', async () => {
    const { service, notifications } = setup();
    await service.approve('a1', 'admin1', ctx);
    expect(notifications).toHaveLength(1);
    expect(notifications[0]).toMatchObject({ userId: 'u1', type: 'SYSTEM', title: 'Hồ sơ Provider đã được duyệt', data: { providerApplication: true } });
  });

  it('tells the applicant why the application was returned', async () => {
    const { service, notifications } = setup();
    await service.reject('a1', 'admin1', { adminNote: 'Vui lòng bổ sung ảnh giấy tờ.' }, ctx);
    expect(notifications).toHaveLength(1);
    expect(notifications[0].title).toBe('Hồ sơ Provider chưa được duyệt');
    expect(notifications[0].body).toContain('Vui lòng bổ sung ảnh giấy tờ.');
  });

  it('does not fail when the applicant has no account yet', async () => {
    const { service, notifications, setApplicant } = setup();
    setApplicant(null);
    await expect(service.reject('a1', 'admin1', { adminNote: 'x' }, ctx)).resolves.toBeDefined();
    expect(notifications).toHaveLength(0);
  });

  it('returns what the user submitted so they can read it back', async () => {
    const { service, findFirstArgs } = setup();
    await service.findMine('u1');
    const select = (findFirstArgs[0] as { select: Record<string, boolean> }).select;
    expect(select).toMatchObject({ name: true, phone: true, email: true, description: true, city: true, categories: true });
  });
});
