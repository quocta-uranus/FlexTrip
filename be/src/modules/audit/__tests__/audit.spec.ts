import { KycDocumentType, Role } from '@prisma/client';
import { AuthHarness, resetDatabase } from '../../auth/__tests__/support/auth-harness';
import { createAdmin, createUser, http } from '../../admin/__tests__/support/admin-fixtures';
import { AuditService } from '../audit.service';

describe('AuditService', () => {
  const h = new AuthHarness();
  let audit: AuditService;
  beforeAll(async () => { await h.open(); audit = h.app.get(AuditService); });
  afterAll(() => h.close());
  beforeEach(() => resetDatabase(h.prisma));

  it('writes module from the action map and serialises Decimal/Date', async () => {
    const admin = await createAdmin(h);
    await h.prisma.$transaction((tx) =>
      audit.log(tx, { actorId: admin.id, actorRole: Role.ADMIN, ip: '1.2.3.4', userAgent: 'jest' }, {
        action: 'USER_SUSPENDED',
        entityType: 'User',
        entityId: 'u1',
        before: { status: 'ACTIVE' },
        after: { status: 'SUSPENDED', at: new Date('2026-09-27T00:00:00Z') },
      }),
    );
    const log = await h.prisma.auditLog.findFirstOrThrow();
    expect(log).toMatchObject({
      actorId: admin.id, actorRole: Role.ADMIN, action: 'USER_SUSPENDED', module: 'USER',
      entityType: 'User', entityId: 'u1', ipAddress: '1.2.3.4', userAgent: 'jest',
      after: { status: 'SUSPENDED', at: '2026-09-27T00:00:00.000Z' },
    });
  });

  it('rolls back with the surrounding transaction', async () => {
    const admin = await createAdmin(h);
    await expect(
      h.prisma.$transaction(async (tx) => {
        await audit.log(tx, { actorId: admin.id, actorRole: Role.ADMIN, ip: null, userAgent: null }, {
          action: 'CONFIG_UPDATED', entityType: 'SystemConfig', entityId: 'platform_fee',
        });
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');
    expect(await h.prisma.auditLog.count()).toBe(0);
  });

  it('KYC review writes KYC_APPROVED', async () => {
    const admin = await createAdmin(h);
    const traveler = await createUser(h);
    const app = await h.prisma.kycApplication.create({
      data: {
        userId: traveler.id, legalName: 'A', documentType: KycDocumentType.NATIONAL_ID,
        documentNumberEncrypted: 'enc', documentNumberFingerprint: 'fp-1', documentNumberLast4: '1234',
        documentFrontUrl: 'https://x.test/f', selfieUrl: 'https://x.test/s',
      },
    });
    const res = await http(h, admin.accessToken).patch(`/kyc/applications/${app.id}/review`, { decision: 'APPROVE' });
    expect(res.status).toBe(200);
    const log = await h.prisma.auditLog.findFirstOrThrow({ where: { action: 'KYC_APPROVED' } });
    expect(log).toMatchObject({ actorId: admin.id, module: 'KYC', entityType: 'KycApplication', entityId: app.id });
  });

  it('provider application reject writes PROVIDER_APPLICATION_REJECTED', async () => {
    const admin = await createAdmin(h);
    const pa = await h.prisma.providerApplication.create({
      data: { name: 'Shop', phone: '0900000000', email: 'shop@example.test', city: 'Đà Lạt', categories: ['VEHICLE'] },
    });
    const res = await http(h, admin.accessToken).patch(`/provider-applications/${pa.id}/reject`, { adminNote: 'Thiếu giấy tờ' });
    expect(res.status).toBe(200);
    expect(await h.prisma.auditLog.count({ where: { action: 'PROVIDER_APPLICATION_REJECTED', entityId: pa.id } })).toBe(1);
  });
});
