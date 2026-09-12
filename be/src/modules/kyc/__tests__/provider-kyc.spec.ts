import { KycStatus, Role, UserStatus } from '@prisma/client';
import request from 'supertest';
import { AuthHarness } from '../../auth/__tests__/support/auth-harness';

describe('AUTH-05 Provider KYC', () => {
  const h = new AuthHarness();
  const document = {
    legalName: 'NGUYEN VAN AN',
    documentType: 'NATIONAL_ID',
    documentNumber: '012345678901',
    documentFrontUrl: 'https://storage.example.test/front.jpg',
    documentBackUrl: 'https://storage.example.test/back.jpg',
    selfieUrl: 'https://storage.example.test/selfie.jpg',
  };

  beforeAll(() => h.open());
  afterAll(() => h.close());
  beforeEach(async () => {
    await h.prisma.kycApplication.deleteMany();
    await h.prisma.passwordResetToken.deleteMany();
    await h.prisma.verificationToken.deleteMany();
    await h.prisma.userRole.deleteMany();
    await h.prisma.user.deleteMany();
  });

  async function createUser(
    email: string,
    roles: Role[] = [Role.TRAVELER],
    verified = true,
    status: UserStatus = UserStatus.ACTIVE,
  ) {
    const registered = await h.register(email);
    await h.prisma.user.update({
      where: { id: registered.userId },
      data: {
        emailVerifiedAt: verified ? new Date() : null,
        status,
      },
    });
    await h.prisma.userRole.deleteMany({
      where: { userId: registered.userId },
    });
    await h.prisma.userRole.createMany({
      data: roles.map((role) => ({ userId: registered.userId, role })),
    });
    const accessToken = await h.jwt.signAsync(
      { sub: registered.userId, roles },
      { secret: process.env.JWT_ACCESS_SECRET },
    );
    return { ...registered, accessToken };
  }

  function api(method: 'post' | 'get' | 'patch', path: string, token: string) {
    return request(h.app.getHttpServer())
      [method]('/api/v1/kyc/' + path)
      .set('Authorization', `Bearer ${token}`);
  }

  it('creates a pending application and encrypts the document number', async () => {
    const traveler = await createUser('traveler@example.com');
    const response = await api(
      'post',
      'applications',
      traveler.accessToken,
    ).send(document);

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      status: 'PENDING',
      documentNumberLast4: '8901',
    });
    expect(response.body).not.toHaveProperty('documentNumber');
    const stored = await h.prisma.kycApplication.findFirstOrThrow();
    expect(stored.documentNumberEncrypted).not.toContain(
      document.documentNumber,
    );
    expect(stored.documentNumberFingerprint).not.toBe(document.documentNumber);
  });

  it('rejects unverified, inactive, Admin-only and forged request fields', async () => {
    const unverified = await createUser(
      'unverified@example.com',
      [Role.TRAVELER],
      false,
    );
    expect(
      (await api('post', 'applications', unverified.accessToken).send(document))
        .status,
    ).toBe(403);

    const suspended = await createUser(
      'suspended@example.com',
      [Role.TRAVELER],
      true,
      UserStatus.SUSPENDED,
    );
    expect(
      (await api('post', 'applications', suspended.accessToken).send(document))
        .status,
    ).toBe(403);

    const admin = await createUser('admin@example.com', [Role.ADMIN]);
    expect(
      (await api('post', 'applications', admin.accessToken).send(document))
        .status,
    ).toBe(403);

    const traveler = await createUser('valid@example.com');
    expect(
      (
        await api('post', 'applications', traveler.accessToken).send({
          ...document,
          role: 'PROVIDER',
        })
      ).status,
    ).toBe(400);
  });

  it('prevents a second pending application and duplicate identity', async () => {
    const first = await createUser('first@example.com');
    expect(
      (await api('post', 'applications', first.accessToken).send(document))
        .status,
    ).toBe(201);
    expect(
      (await api('post', 'applications', first.accessToken).send(document))
        .status,
    ).toBe(409);

    const second = await createUser('second@example.com');
    expect(
      (await api('post', 'applications', second.accessToken).send(document))
        .status,
    ).toBe(409);
  });

  it('allows only one concurrent claim for an identity document', async () => {
    const first = await createUser('first@example.com');
    const second = await createUser('second@example.com');
    const responses = await Promise.all([
      api('post', 'applications', first.accessToken).send(document),
      api('post', 'applications', second.accessToken).send(document),
    ]);
    expect(responses.map(({ status }) => status).sort()).toEqual([201, 409]);
    expect(await h.prisma.kycApplication.count()).toBe(1);
  });

  it('allows an Admin to inspect and approve while retaining TRAVELER', async () => {
    const traveler = await createUser('traveler@example.com');
    const submitted = await api(
      'post',
      'applications',
      traveler.accessToken,
    ).send(document);
    const admin = await createUser('admin@example.com', [Role.ADMIN]);

    const list = await api('get', 'applications', admin.accessToken);
    expect(list.status).toBe(200);
    expect(list.body[0]).toMatchObject({
      documentNumber: document.documentNumber,
      status: 'PENDING',
    });

    const reviewed = await api(
      'patch',
      `applications/${submitted.body.id}/review`,
      admin.accessToken,
    ).send({ decision: 'APPROVE' });
    expect(reviewed.status).toBe(200);
    expect(reviewed.body.status).toBe('APPROVED');

    const user = await h.prisma.user.findUniqueOrThrow({
      where: { id: traveler.userId },
      include: { roles: true },
    });
    expect(user.isKycVerified).toBe(true);
    expect(user.roles.map(({ role }) => role).sort()).toEqual([
      Role.PROVIDER,
      Role.TRAVELER,
    ]);
  });

  it('requires a rejection reason and permits corrected resubmission', async () => {
    const traveler = await createUser('traveler@example.com');
    const submitted = await api(
      'post',
      'applications',
      traveler.accessToken,
    ).send(document);
    const admin = await createUser('admin@example.com', [Role.ADMIN]);

    expect(
      (
        await api(
          'patch',
          `applications/${submitted.body.id}/review`,
          admin.accessToken,
        ).send({ decision: 'REJECT' })
      ).status,
    ).toBe(400);
    const rejected = await api(
      'patch',
      `applications/${submitted.body.id}/review`,
      admin.accessToken,
    ).send({ decision: 'REJECT', rejectionReason: 'Image is unreadable' });
    expect(rejected.body).toMatchObject({
      status: 'REJECTED',
      rejectionReason: 'Image is unreadable',
    });

    const resubmitted = await api(
      'post',
      'applications',
      traveler.accessToken,
    ).send({ ...document, selfieUrl: 'https://storage.example.test/new.jpg' });
    expect(resubmitted.status).toBe(201);
    expect(resubmitted.body.status).toBe('PENDING');
    expect(resubmitted.body.id).toBe(submitted.body.id);
  });

  it('serializes concurrent review so only one Admin request succeeds', async () => {
    const traveler = await createUser('traveler@example.com');
    const submitted = await api(
      'post',
      'applications',
      traveler.accessToken,
    ).send(document);
    const admin = await createUser('admin@example.com', [Role.ADMIN]);
    const responses = await Promise.all([
      api(
        'patch',
        `applications/${submitted.body.id}/review`,
        admin.accessToken,
      ).send({ decision: 'APPROVE' }),
      api(
        'patch',
        `applications/${submitted.body.id}/review`,
        admin.accessToken,
      ).send({ decision: 'REJECT', rejectionReason: 'Duplicate review' }),
    ]);
    expect(responses.map(({ status }) => status).sort()).toEqual([200, 409]);
    expect(
      await h.prisma.userRole.count({
        where: { userId: traveler.userId, role: Role.PROVIDER },
      }),
    ).toBe(1);
  });

  it('does not trust stale JWT roles for Admin APIs', async () => {
    const traveler = await createUser('traveler@example.com');
    const submitted = await api(
      'post',
      'applications',
      traveler.accessToken,
    ).send(document);
    const forged = await h.jwt.signAsync(
      { sub: traveler.userId, roles: [Role.ADMIN] },
      { secret: process.env.JWT_ACCESS_SECRET },
    );
    expect((await api('get', 'applications', forged)).status).toBe(403);
    expect(
      (
        await api(
          'patch',
          `applications/${submitted.body.id}/review`,
          forged,
        ).send({ decision: 'APPROVE' })
      ).status,
    ).toBe(403);
    expect(
      await h.prisma.kycApplication.count({
        where: { status: KycStatus.PENDING },
      }),
    ).toBe(1);
  });
});
