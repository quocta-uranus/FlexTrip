import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Prisma, Role, UserStatus } from '@prisma/client';
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  timingSafeEqual,
} from 'crypto';
import * as speakeasy from 'speakeasy';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../../prisma/prisma.service';
import { RegisterDto, LoginDto } from '../dto';
import { MailService } from './mail.service';

export const VERIFICATION_TTL_MS = 30 * 60 * 1000;
export const RESEND_COOLDOWN_MS = 60 * 1000;
export const PASSWORD_RESET_TTL_MS = 30 * 60 * 1000;
const BCRYPT_ROUNDS = 10;
const AUTH_USER_INCLUDE = { roles: true } as const;
type AuthUser = Prisma.UserGetPayload<{ include: typeof AUTH_USER_INCLUDE }>;
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}
export type LoginResult =
  | AuthTokens
  | ({ requiresTwoFactor: true; challengeToken: string } & Record<
      'accessToken' | 'refreshToken',
      never
    >);
export interface RegistrationResult {
  code:
    | 'REGISTRATION_PENDING_VERIFICATION'
    | 'REGISTRATION_CREATED_EMAIL_SEND_FAILED';
  message: string;
  nextAction: 'VERIFY_EMAIL' | 'RESEND_VERIFICATION';
  retryAfterSeconds?: number;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly mail: MailService,
  ) {}

  async register(dto: RegisterDto): Promise<RegistrationResult> {
    const password = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const token = randomBytes(32).toString('hex');
    const now = new Date();
    let user: { id: string; email: string };
    try {
      user = await this.prisma.$transaction(async (tx) => {
        const created = await tx.user.create({
          data: {
            email: dto.email,
            name: dto.name,
            password,
            verificationRequestedAt: now,
          },
          select: { id: true, email: true },
        });
        await tx.userRole.create({
          data: { userId: created.id, role: Role.TRAVELER },
        });
        await tx.verificationToken.create({
          data: this.tokenData(created.id, token, now),
        });
        return created;
      });
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002' &&
        error.meta?.modelName === 'User' &&
        this.isEmailConstraint(error.meta)
      ) {
        throw new ConflictException({
          code: 'EMAIL_ALREADY_REGISTERED',
          message:
            'Email already registered. Sign in or request verification again.',
        });
      }
      throw error;
    }
    if (!(await this.deliver(user.id, user.email, token))) {
      return {
        code: 'REGISTRATION_CREATED_EMAIL_SEND_FAILED',
        message:
          'Account created, but verification email could not be sent. Request another email after 60 seconds.',
        nextAction: 'RESEND_VERIFICATION',
        retryAfterSeconds: 60,
      };
    }
    return {
      code: 'REGISTRATION_PENDING_VERIFICATION',
      message:
        'Account created. Verification email accepted by SMTP; verify your email before signing in.',
      nextAction: 'VERIFY_EMAIL',
    };
  }

  async verifyEmail(token: string): Promise<{ code: string }> {
    const tokenHash = this.hashToken(token);
    await this.prisma.$transaction(async (tx) => {
      const candidate = await tx.verificationToken.findUnique({
        where: { tokenHash },
      });
      if (!candidate) throw this.invalidToken();
      // Both verify and resend lock the user first, so competing requests serialize.
      await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${candidate.userId} FOR UPDATE`;
      const current = await tx.verificationToken.findUnique({
        where: { tokenHash },
      });
      const user = await tx.user.findUnique({
        where: { id: candidate.userId },
      });
      const now = new Date();
      if (
        !current ||
        !user ||
        user.emailVerifiedAt ||
        current.usedAt ||
        current.invalidatedAt ||
        current.expiresAt <= now
      )
        throw this.invalidToken();
      const consumed = await tx.verificationToken.updateMany({
        where: {
          id: current.id,
          usedAt: null,
          invalidatedAt: null,
          expiresAt: { gt: now },
        },
        data: { usedAt: now },
      });
      if (consumed.count !== 1) throw this.invalidToken();
      await tx.user.update({
        where: { id: user.id },
        data: { emailVerifiedAt: now },
      });
      await tx.verificationToken.updateMany({
        where: {
          userId: user.id,
          id: { not: current.id },
          usedAt: null,
          invalidatedAt: null,
        },
        data: { invalidatedAt: now },
      });
    });
    return { code: 'EMAIL_VERIFIED' };
  }

  async resendVerification(email: string): Promise<{ code: string }> {
    const delivery = await this.prisma.$transaction(async (tx) => {
      const candidate = await tx.user.findUnique({
        where: { email },
        select: { id: true },
      });
      if (!candidate) return null;
      await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${candidate.id} FOR UPDATE`;
      const user = await tx.user.findUnique({ where: { id: candidate.id } });
      const now = new Date();
      if (
        !user ||
        user.emailVerifiedAt ||
        (user.verificationRequestedAt &&
          now.getTime() - user.verificationRequestedAt.getTime() <
            RESEND_COOLDOWN_MS)
      )
        return null;
      const token = randomBytes(32).toString('hex');
      await tx.user.update({
        where: { id: user.id },
        data: { verificationRequestedAt: now },
      });
      await tx.verificationToken.create({
        data: this.tokenData(user.id, token, now),
      });
      return { userId: user.id, email: user.email, token };
    });
    if (delivery)
      await this.deliver(delivery.userId, delivery.email, delivery.token);
    return { code: 'VERIFICATION_EMAIL_REQUEST_ACCEPTED' };
  }

  async login(dto: LoginDto): Promise<LoginResult> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: AUTH_USER_INCLUDE,
    });
    if (!user || !(await bcrypt.compare(dto.password, user.password)))
      throw new UnauthorizedException('Invalid credentials');
    this.assertCanAuthenticate(user);
    if (user.twoFactorEnabled) {
      return {
        requiresTwoFactor: true,
        challengeToken: await this.jwt.signAsync(
          { sub: user.id, purpose: '2fa-login' },
          {
            secret: this.config.getOrThrow<string>(
              'TWO_FACTOR_CHALLENGE_SECRET',
            ),
            expiresIn: '5m',
          },
        ),
      } as LoginResult;
    }
    return this.signTokens(user);
  }

  async setupTwoFactor(
    userId: string,
  ): Promise<{ secret: string; otpauthUrl: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: AUTH_USER_INCLUDE,
    });
    if (!user) throw new UnauthorizedException();
    this.assertCanAuthenticate(user);
    this.assertTwoFactorEligible(user);
    const generated = speakeasy.generateSecret({
      name: `FlexTrip:${user.email}`,
      issuer: 'FlexTrip',
      length: 20,
    });
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorSecret: this.encryptSecret(generated.base32),
        twoFactorEnabled: false,
        twoFactorRecoveryCodes: [],
      },
    });
    return { secret: generated.base32, otpauthUrl: generated.otpauth_url! };
  }

  async enableTwoFactor(
    userId: string,
    code: string,
  ): Promise<{ code: string; recoveryCodes: string[] }> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: AUTH_USER_INCLUDE,
    });
    this.assertCanAuthenticate(user);
    this.assertTwoFactorEligible(user);
    if (!user.twoFactorSecret || !this.verifyTotp(user.twoFactorSecret, code))
      throw new BadRequestException({ code: 'INVALID_TWO_FACTOR_CODE' });
    const recoveryCodes = Array.from({ length: 8 }, () => {
      const value = randomBytes(4).toString('hex').toUpperCase();
      return `${value.slice(0, 4)}-${value.slice(4)}`;
    });
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: true,
        twoFactorRecoveryCodes: recoveryCodes.map((value) =>
          this.hashToken(value),
        ),
      },
    });
    return { code: 'TWO_FACTOR_ENABLED', recoveryCodes };
  }

  async verifyTwoFactorLogin(
    challengeToken: string,
    code: string,
  ): Promise<AuthTokens> {
    let payload: { sub?: unknown; purpose?: unknown };
    try {
      payload = await this.jwt.verifyAsync(challengeToken, {
        secret: this.config.getOrThrow<string>('TWO_FACTOR_CHALLENGE_SECRET'),
        algorithms: ['HS256'],
      });
    } catch {
      throw new UnauthorizedException({ code: 'INVALID_TWO_FACTOR_CHALLENGE' });
    }
    if (typeof payload.sub !== 'string' || payload.purpose !== '2fa-login')
      throw new UnauthorizedException({ code: 'INVALID_TWO_FACTOR_CHALLENGE' });
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: AUTH_USER_INCLUDE,
    });
    if (!user) throw new UnauthorizedException();
    this.assertCanAuthenticate(user);
    if (
      !user.twoFactorEnabled ||
      !user.twoFactorSecret ||
      !(await this.consumeTwoFactorCode(
        user.id,
        user.twoFactorSecret,
        user.twoFactorRecoveryCodes,
        code,
      ))
    )
      throw new UnauthorizedException({ code: 'INVALID_TWO_FACTOR_CODE' });
    return this.signTokens(user);
  }

  async disableTwoFactor(
    userId: string,
    code: string,
  ): Promise<{ code: string }> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: AUTH_USER_INCLUDE,
    });
    this.assertCanAuthenticate(user);
    this.assertTwoFactorEligible(user);
    if (
      !user.twoFactorEnabled ||
      !user.twoFactorSecret ||
      !(await this.consumeTwoFactorCode(
        user.id,
        user.twoFactorSecret,
        user.twoFactorRecoveryCodes,
        code,
      ))
    )
      throw new BadRequestException({ code: 'INVALID_TWO_FACTOR_CODE' });
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorRecoveryCodes: [],
        refreshToken: null,
      },
    });
    return { code: 'TWO_FACTOR_DISABLED' };
  }

  async refresh(token: string): Promise<AuthTokens> {
    let payload: { sub?: unknown };
    try {
      payload = await this.jwt.verifyAsync<{ sub?: unknown }>(token, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
        algorithms: ['HS256'],
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
    if (typeof payload.sub !== 'string')
      throw new UnauthorizedException('Invalid refresh token');
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: AUTH_USER_INCLUDE,
    });
    if (
      !user?.refreshToken ||
      !timingSafeEqual(
        Buffer.from(this.hashToken(token), 'hex'),
        Buffer.from(this.hashToken(user.refreshToken), 'hex'),
      )
    )
      throw new UnauthorizedException('Invalid refresh token');
    this.assertCanAuthenticate(user);
    return this.signTokens(user);
  }

  async logout(token: string): Promise<void> {
    let payload: { sub?: unknown };
    try {
      payload = await this.jwt.verifyAsync<{ sub?: unknown }>(token, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
        algorithms: ['HS256'],
        ignoreExpiration: true,
      });
    } catch {
      return;
    }
    if (typeof payload.sub !== 'string') return;
    await this.prisma.user.updateMany({
      where: { id: payload.sub, refreshToken: token },
      data: { refreshToken: null },
    });
  }

  async forgotPassword(email: string): Promise<{ code: string }> {
    const delivery = await this.prisma.$transaction(async (tx) => {
      const candidate = await tx.user.findUnique({
        where: { email },
        include: { roles: true },
      });
      if (!candidate) return null;
      await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${candidate.id} FOR UPDATE`;
      const user = await tx.user.findUnique({
        where: { id: candidate.id },
        include: { roles: true },
      });
      const now = new Date();
      const eligible = user?.roles.some(
        ({ role }) => role === Role.TRAVELER || role === Role.PROVIDER,
      );
      if (
        !user ||
        !eligible ||
        (user.passwordResetRequestedAt &&
          now.getTime() - user.passwordResetRequestedAt.getTime() <
            RESEND_COOLDOWN_MS)
      )
        return null;
      const token = randomBytes(32).toString('hex');
      await tx.user.update({
        where: { id: user.id },
        data: { passwordResetRequestedAt: now },
      });
      await tx.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash: this.hashToken(token),
          createdAt: now,
          expiresAt: new Date(now.getTime() + PASSWORD_RESET_TTL_MS),
        },
      });
      return { userId: user.id, email: user.email, token };
    });
    if (delivery)
      await this.deliverReset(delivery.userId, delivery.email, delivery.token);
    return { code: 'PASSWORD_RESET_REQUEST_ACCEPTED' };
  }

  async resetPassword(
    token: string,
    newPassword: string,
  ): Promise<{ code: string }> {
    const tokenHash = this.hashToken(token);
    const password = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await this.prisma.$transaction(async (tx) => {
      const candidate = await tx.passwordResetToken.findUnique({
        where: { tokenHash },
      });
      if (!candidate) throw this.invalidResetToken();
      await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${candidate.userId} FOR UPDATE`;
      const current = await tx.passwordResetToken.findUnique({
        where: { tokenHash },
      });
      const now = new Date();
      if (
        !current ||
        current.usedAt ||
        current.invalidatedAt ||
        current.expiresAt <= now
      )
        throw this.invalidResetToken();
      const consumed = await tx.passwordResetToken.updateMany({
        where: {
          id: current.id,
          usedAt: null,
          invalidatedAt: null,
          expiresAt: { gt: now },
        },
        data: { usedAt: now },
      });
      if (consumed.count !== 1) throw this.invalidResetToken();
      await tx.user.update({
        where: { id: current.userId },
        data: { password, refreshToken: null },
      });
      await tx.passwordResetToken.updateMany({
        where: {
          userId: current.userId,
          id: { not: current.id },
          usedAt: null,
          invalidatedAt: null,
        },
        data: { invalidatedAt: now },
      });
    });
    return { code: 'PASSWORD_RESET_SUCCESS' };
  }

  private assertCanAuthenticate(user: AuthUser): void {
    if (user.status !== UserStatus.ACTIVE)
      throw new ForbiddenException({ code: 'ACCOUNT_NOT_ACTIVE' });
    if (!user.emailVerifiedAt)
      throw new ForbiddenException({ code: 'EMAIL_NOT_VERIFIED' });
    if (
      !user.roles.length ||
      user.roles.some(({ role }) => !Object.values(Role).includes(role))
    )
      throw new ForbiddenException({ code: 'ACCOUNT_ROLES_INVALID' });
  }

  private assertTwoFactorEligible(user: AuthUser): void {
    if (
      !user.roles.some(
        ({ role }) => role === Role.TRAVELER || role === Role.PROVIDER,
      )
    )
      throw new ForbiddenException({ code: 'TWO_FACTOR_NOT_AVAILABLE' });
  }

  private async signTokens(user: AuthUser): Promise<AuthTokens> {
    const payload = {
      sub: user.id,
      email: user.email,
      roles: user.roles.map(({ role }) => role),
    };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload),
      this.jwt.signAsync(payload, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get('JWT_REFRESH_EXPIRES', '7d'),
        jwtid: randomBytes(16).toString('hex'),
      }),
    ]);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshToken },
    });
    return { accessToken, refreshToken };
  }

  private tokenData(
    userId: string,
    token: string,
    now: Date,
  ): Prisma.VerificationTokenUncheckedCreateInput {
    return {
      userId,
      tokenHash: this.hashToken(token),
      createdAt: now,
      expiresAt: new Date(now.getTime() + VERIFICATION_TTL_MS),
    };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private isEmailConstraint(meta: Record<string, unknown>): boolean {
    if (Array.isArray(meta.target) && meta.target.includes('email'))
      return true;
    const constraint = meta.driverAdapterError;
    return (
      typeof constraint === 'object' &&
      constraint !== null &&
      JSON.stringify(constraint).includes('User_email_key')
    );
  }
  private invalidToken(): BadRequestException {
    return new BadRequestException({ code: 'INVALID_VERIFICATION_TOKEN' });
  }

  private invalidResetToken(): BadRequestException {
    return new BadRequestException({ code: 'INVALID_PASSWORD_RESET_TOKEN' });
  }

  private encryptionKey(): Buffer {
    const key = Buffer.from(
      this.config.getOrThrow<string>('TWO_FACTOR_ENCRYPTION_KEY'),
      'base64',
    );
    if (key.length !== 32) throw new Error('Invalid TWO_FACTOR_ENCRYPTION_KEY');
    return key;
  }

  private encryptSecret(secret: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.encryptionKey(), iv);
    const encrypted = Buffer.concat([
      cipher.update(secret, 'utf8'),
      cipher.final(),
    ]);
    return [iv, cipher.getAuthTag(), encrypted]
      .map((value) => value.toString('base64'))
      .join('.');
  }

  private decryptSecret(value: string): string {
    const [iv, tag, encrypted] = value
      .split('.')
      .map((part) => Buffer.from(part, 'base64'));
    const decipher = createDecipheriv('aes-256-gcm', this.encryptionKey(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]).toString('utf8');
  }

  private verifyTotp(secret: string, code: string): boolean {
    if (!/^\d{6}$/.test(code)) return false;
    return speakeasy.totp.verify({
      secret: this.decryptSecret(secret),
      encoding: 'base32',
      token: code,
      window: 1,
    });
  }

  private async consumeTwoFactorCode(
    userId: string,
    secret: string,
    recoveryHashes: string[],
    code: string,
  ): Promise<boolean> {
    if (this.verifyTotp(secret, code)) return true;
    const normalized = code.toUpperCase();
    const hash = this.hashToken(normalized);
    if (!recoveryHashes.includes(hash)) return false;
    const result = await this.prisma.user.updateMany({
      where: { id: userId, twoFactorRecoveryCodes: { has: hash } },
      data: {
        twoFactorRecoveryCodes: {
          set: recoveryHashes.filter((value) => value !== hash),
        },
      },
    });
    return result.count === 1;
  }

  private async deliver(
    userId: string,
    email: string,
    token: string,
  ): Promise<boolean> {
    try {
      await this.mail.sendVerification(email, token);
      return true;
    } catch {
      // SMTP exceptions may contain credentials or addresses; never log the exception.
      console.error({
        event: 'verification_email_send_failed',
        code: 'SMTP_SEND_FAILED',
        userId,
      });
      return false;
    }
  }

  private async deliverReset(
    userId: string,
    email: string,
    token: string,
  ): Promise<void> {
    try {
      await this.mail.sendPasswordReset(email, token);
    } catch {
      console.error({
        event: 'password_reset_email_send_failed',
        code: 'SMTP_SEND_FAILED',
        userId,
      });
    }
  }
}
