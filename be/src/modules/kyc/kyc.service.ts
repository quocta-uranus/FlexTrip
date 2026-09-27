import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  KycApplication,
  KycStatus,
  Prisma,
  Role,
  UserStatus,
} from '@prisma/client';
import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
} from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { KycReviewDecision, ReviewKycDto, SubmitKycDto } from './dto';
import { AuditService } from '../audit/audit.service';
import { RequestContext } from '../../common/request-context';

const USER_WITH_ROLES = { roles: true } as const;

@Injectable()
export class KycService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
  ) {}

  async submit(userId: string, dto: SubmitKycDto) {
    const fingerprint = this.fingerprint(dto.documentNumber);
    try {
      return await this.prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${userId} FOR UPDATE`;
        const user = await tx.user.findUnique({
          where: { id: userId },
          include: USER_WITH_ROLES,
        });
        this.assertEligibleTraveler(user);

        const existingIdentity = await tx.kycApplication.findUnique({
          where: { documentNumberFingerprint: fingerprint },
        });
        if (existingIdentity && existingIdentity.userId !== userId) {
          throw new ConflictException({
            code: 'IDENTITY_DOCUMENT_ALREADY_USED',
          });
        }
        const existing = await tx.kycApplication.findFirst({
          where: { userId },
          orderBy: { submittedAt: 'desc' },
        });
        if (existing?.status === KycStatus.PENDING)
          throw new ConflictException({
            code: 'KYC_APPLICATION_ALREADY_PENDING',
          });
        if (existing?.status === KycStatus.APPROVED || user.isKycVerified)
          throw new ConflictException({ code: 'KYC_ALREADY_APPROVED' });

        const data = this.applicationData(userId, dto, fingerprint);
        const application = existing
          ? await tx.kycApplication.update({
              where: { id: existing.id },
              data: {
                ...data,
                status: KycStatus.PENDING,
                rejectionReason: null,
                reviewedAt: null,
                reviewedById: null,
                submittedAt: new Date(),
              },
            })
          : await tx.kycApplication.create({ data });
        return this.publicSummary(application);
      });
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      )
        throw new ConflictException({ code: 'IDENTITY_DOCUMENT_ALREADY_USED' });
      throw error;
    }
  }

  async getMine(userId: string) {
    await this.requireCurrentUser(userId, [Role.TRAVELER, Role.PROVIDER]);
    const application = await this.prisma.kycApplication.findFirst({
      where: { userId },
      orderBy: { submittedAt: 'desc' },
    });
    if (!application)
      throw new NotFoundException({ code: 'KYC_NOT_SUBMITTED' });
    return this.publicSummary(application);
  }

  async listForAdmin(userId: string, status: KycStatus = KycStatus.PENDING) {
    await this.requireCurrentUser(userId, [Role.ADMIN]);
    const applications = await this.prisma.kycApplication.findMany({
      where: { status },
      orderBy: { submittedAt: 'asc' },
      take: 100,
      include: { applicant: { select: { email: true } } },
    });
    return applications.map((application) => ({
      id: application.id,
      userId: application.userId,
      email: application.applicant.email,
      legalName: application.legalName,
      documentType: application.documentType,
      documentNumber: this.decrypt(application.documentNumberEncrypted),
      documentFrontUrl: application.documentFrontUrl,
      documentBackUrl: application.documentBackUrl,
      selfieUrl: application.selfieUrl,
      status: application.status,
      submittedAt: application.submittedAt,
    }));
  }

  async review(adminId: string, applicationId: string, dto: ReviewKycDto, ctx: RequestContext) {
    return this.prisma.$transaction(async (tx) => {
      await this.requireCurrentUser(adminId, [Role.ADMIN], tx);
      const locked = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT "id" FROM "KycApplication" WHERE "id" = ${applicationId} FOR UPDATE`;
      if (!locked.length)
        throw new NotFoundException({ code: 'KYC_APPLICATION_NOT_FOUND' });
      const application = await tx.kycApplication.findUniqueOrThrow({
        where: { id: applicationId },
      });
      if (application.status !== KycStatus.PENDING)
        throw new ConflictException({
          code: 'KYC_APPLICATION_ALREADY_REVIEWED',
        });
      if (
        dto.decision === KycReviewDecision.REJECT &&
        !dto.rejectionReason?.trim()
      )
        throw new BadRequestException({ code: 'REJECTION_REASON_REQUIRED' });

      const now = new Date();
      const approved = dto.decision === KycReviewDecision.APPROVE;
      const updated = await tx.kycApplication.update({
        where: { id: application.id },
        data: {
          status: approved ? KycStatus.APPROVED : KycStatus.REJECTED,
          rejectionReason: approved ? null : dto.rejectionReason,
          reviewedAt: now,
          reviewedById: adminId,
        },
      });
      if (approved) {
        await tx.user.update({
          where: { id: application.userId },
          data: { isKycVerified: true },
        });
        await tx.userRole.upsert({
          where: {
            userId_role: { userId: application.userId, role: Role.PROVIDER },
          },
          create: { userId: application.userId, role: Role.PROVIDER },
          update: {},
        });
      }
      await this.audit.log(tx, ctx, {
        action: dto.decision === 'APPROVE' ? 'KYC_APPROVED' : 'KYC_REJECTED',
        entityType: 'KycApplication',
        entityId: applicationId,
        before: { status: application.status },
        after: { status: updated.status, rejectionReason: updated.rejectionReason ?? null },
      });
      return this.publicSummary(updated);
    });
  }

  private assertEligibleTraveler(
    user: Prisma.UserGetPayload<{ include: typeof USER_WITH_ROLES }> | null,
  ): asserts user is Prisma.UserGetPayload<{
    include: typeof USER_WITH_ROLES;
  }> {
    if (!user) throw new ForbiddenException({ code: 'ACCOUNT_NOT_ELIGIBLE' });
    if (user.status !== UserStatus.ACTIVE || !user.emailVerifiedAt)
      throw new ForbiddenException({ code: 'ACCOUNT_NOT_ELIGIBLE' });
    if (!user.roles.some(({ role }) => role === Role.TRAVELER))
      throw new ForbiddenException({ code: 'TRAVELER_ROLE_REQUIRED' });
    if (user.roles.some(({ role }) => role === Role.ADMIN))
      throw new ForbiddenException({ code: 'TRAVELER_ROLE_REQUIRED' });
  }

  private async requireCurrentUser(
    userId: string,
    allowedRoles: Role[],
    db: PrismaService | Prisma.TransactionClient = this.prisma,
  ) {
    const user = await db.user.findUnique({
      where: { id: userId },
      include: USER_WITH_ROLES,
    });
    if (!user || user.status !== UserStatus.ACTIVE || !user.emailVerifiedAt)
      throw new ForbiddenException({ code: 'ACCOUNT_NOT_ELIGIBLE' });
    if (!user.roles.some(({ role }) => allowedRoles.includes(role)))
      throw new ForbiddenException({ code: 'INSUFFICIENT_ROLE' });
    return user;
  }

  private applicationData(
    userId: string,
    dto: SubmitKycDto,
    fingerprint: string,
  ) {
    return {
      userId,
      legalName: dto.legalName,
      documentType: dto.documentType,
      documentNumberEncrypted: this.encrypt(dto.documentNumber),
      documentNumberFingerprint: fingerprint,
      documentNumberLast4: dto.documentNumber.slice(-4),
      documentFrontUrl: dto.documentFrontUrl,
      documentBackUrl: dto.documentBackUrl,
      selfieUrl: dto.selfieUrl,
    };
  }

  private publicSummary(application: KycApplication) {
    return {
      id: application.id,
      status: application.status,
      documentType: application.documentType,
      documentNumberLast4: application.documentNumberLast4,
      rejectionReason: application.rejectionReason,
      submittedAt: application.submittedAt,
      reviewedAt: application.reviewedAt,
    };
  }

  private fingerprint(value: string): string {
    return createHmac(
      'sha256',
      this.config.getOrThrow<string>('KYC_FINGERPRINT_SECRET'),
    )
      .update(value)
      .digest('hex');
  }

  private encryptionKey(): Buffer {
    const key = Buffer.from(
      this.config.getOrThrow<string>('KYC_ENCRYPTION_KEY'),
      'base64',
    );
    if (key.length !== 32)
      throw new Error('KYC_ENCRYPTION_KEY must decode to 32 bytes');
    return key;
  }

  private encrypt(value: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.encryptionKey(), iv);
    const ciphertext = Buffer.concat([
      cipher.update(value, 'utf8'),
      cipher.final(),
    ]);
    return [iv, cipher.getAuthTag(), ciphertext]
      .map((part) => part.toString('base64url'))
      .join('.');
  }

  private decrypt(value: string): string {
    const [iv, tag, ciphertext] = value
      .split('.')
      .map((part) => Buffer.from(part, 'base64url'));
    if (!iv || !tag || !ciphertext)
      throw new Error('Invalid encrypted KYC data');
    const decipher = createDecipheriv('aes-256-gcm', this.encryptionKey(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString('utf8');
  }
}
