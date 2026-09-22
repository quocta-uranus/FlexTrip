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
} from 'crypto';
import * as speakeasy from 'speakeasy';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../../prisma/prisma.service';
import { RegisterDto, LoginDto } from '../dto';
import { OtpService } from './otp.service';
import { ResendService } from './resend.service';

export const RESEND_COOLDOWN_MS = 60 * 1000;
export const PASSWORD_RESET_TTL_MS = 30 * 60 * 1000;
const BCRYPT_ROUNDS = 10;
const AUTH_USER_INCLUDE = { roles: true } as const;
type AuthUser = Prisma.UserGetPayload<{ include: typeof AUTH_USER_INCLUDE }>;
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}
export interface SessionContext {
  deviceName?: string;
  userAgent?: string;
  ipAddress?: string;
}
export type LoginResult =
  | AuthTokens
  | ({ requiresTwoFactor: true; challengeToken: string } & Record<
      'accessToken' | 'refreshToken',
      never
    >);
export interface RegistrationResult {
  code: 'OTP_SENT' | 'OTP_SEND_FAILED';
  email: string;
  message: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly otp: OtpService,
    private readonly resend: ResendService,
  ) {}

  async register(dto: RegisterDto): Promise<RegistrationResult> {
    const password = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    let userId: string;
    try {
      const created = await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            email: dto.email,
            name: dto.name,
            password,
            ...(dto.phone ? { phone: dto.phone } : {}),
          },
          select: { id: true },
        });
        await tx.userRole.create({
          data: { userId: user.id, role: Role.TRAVELER },
        });
        return user;
      });
      userId = created.id;
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002' &&
        error.meta?.modelName === 'User' &&
        this.isEmailConstraint(error.meta)
      ) {
        throw new ConflictException({
          code: 'EMAIL_ALREADY_REGISTERED',
          message: 'Email already registered. Sign in or use forgot password.',
        });
      }
      throw error;
    }
    const code = await this.otp.generate('register', dto.email);
    const sent = await this.resend.sendOtp(dto.email, code);
    return sent
      ? {
          code: 'OTP_SENT',
          email: dto.email,
          message: 'Mã OTP đã được gửi tới email của bạn.',
        }
      : {
          code: 'OTP_SEND_FAILED',
          email: dto.email,
          message: 'Tài khoản đã được tạo nhưng không thể gửi OTP. Thử lại sau.',
        };
  }

  async verifyRegistrationOtp(
    email: string,
    code: string,
  ): Promise<{ code: string }> {
    const valid = await this.otp.verify('register', email, code);
    if (!valid)
      throw new BadRequestException({ code: 'INVALID_OTP', message: 'Mã OTP không đúng hoặc đã hết hạn.' });
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, emailVerifiedAt: true },
    });
    if (!user)
      throw new BadRequestException({ code: 'INVALID_OTP', message: 'Mã OTP không đúng hoặc đã hết hạn.' });
    if (user.emailVerifiedAt) return { code: 'EMAIL_ALREADY_VERIFIED' };
    await this.prisma.user.update({
      where: { id: user.id },
      data: { emailVerifiedAt: new Date() },
    });
    return { code: 'EMAIL_VERIFIED' };
  }

  async resendRegistrationOtp(email: string): Promise<{ code: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, emailVerifiedAt: true },
    });
    if (!user || user.emailVerifiedAt)
      return { code: 'RESEND_ACCEPTED' };
    const allowed = await this.otp.canResend('register', email);
    if (!allowed)
      throw new BadRequestException({ code: 'RESEND_TOO_SOON', message: 'Vui lòng đợi ít nhất 60 giây trước khi gửi lại.' });
    const code = await this.otp.generate('register', email);
    await this.resend.sendOtp(email, code);
    return { code: 'RESEND_ACCEPTED' };
  }

  async login(
    dto: LoginDto,
    context: SessionContext = {},
  ): Promise<LoginResult> {
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
          {
            sub: user.id,
            purpose: '2fa-login',
            context: { ...context, deviceName: dto.deviceName },
          },
          {
            secret: this.config.getOrThrow<string>(
              'TWO_FACTOR_CHALLENGE_SECRET',
            ),
            expiresIn: '5m',
          },
        ),
      } as LoginResult;
    }
    return this.signTokens(user, { ...context, deviceName: dto.deviceName });
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
    let payload: { sub?: unknown; purpose?: unknown; context?: SessionContext };
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
    return this.signTokens(user, payload.context ?? {});
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
    await this.prisma.authSession.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { code: 'TWO_FACTOR_DISABLED' };
  }

  async refresh(token: string): Promise<AuthTokens> {
    let payload: { sub?: unknown; sid?: unknown };
    try {
      payload = await this.jwt.verifyAsync<{ sub?: unknown; sid?: unknown }>(
        token,
        {
          secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
          algorithms: ['HS256'],
        },
      );
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
    if (typeof payload.sub !== 'string')
      throw new UnauthorizedException('Invalid refresh token');
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: AUTH_USER_INCLUDE,
    });
    if (!user) throw new UnauthorizedException('Invalid refresh token');
    this.assertCanAuthenticate(user);
    const tokenHash = this.hashToken(token);
    if (typeof payload.sid === 'string') {
      const session = await this.prisma.authSession.findUnique({
        where: { id: payload.sid },
      });
      if (
        !session ||
        session.userId !== user.id ||
        session.refreshTokenHash !== tokenHash ||
        session.revokedAt ||
        session.expiresAt <= new Date()
      )
        throw new UnauthorizedException('Invalid refresh token');
      return this.signTokens(
        user,
        {
          deviceName: session.deviceName ?? undefined,
          userAgent: session.userAgent ?? undefined,
          ipAddress: session.ipAddress ?? undefined,
        },
        session.id,
        tokenHash,
      );
    }
    if (!user.refreshToken || this.hashToken(user.refreshToken) !== tokenHash)
      throw new UnauthorizedException('Invalid refresh token');
    return this.signTokens(user, { deviceName: 'Legacy session' });
  }

  async logout(token: string): Promise<void> {
    let payload: { sub?: unknown; sid?: unknown };
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
    if (typeof payload.sid === 'string') {
      await this.prisma.authSession.updateMany({
        where: { id: payload.sid, userId: payload.sub, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    await this.prisma.user.updateMany({
      where: { id: payload.sub, refreshToken: token },
      data: { refreshToken: null },
    });
  }

  async listSessions(userId: string, currentSessionId?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: AUTH_USER_INCLUDE,
    });
    if (!user) throw new UnauthorizedException();
    this.assertCanAuthenticate(user);
    this.assertTwoFactorEligible(user);
    const sessions = await this.prisma.authSession.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { lastUsedAt: 'desc' },
    });
    return sessions.map(
      ({
        id,
        deviceName,
        userAgent,
        ipAddress,
        createdAt,
        lastUsedAt,
        expiresAt,
      }) => ({
        id,
        deviceName,
        userAgent,
        ipAddress,
        createdAt,
        lastUsedAt,
        expiresAt,
        current: id === currentSessionId,
      }),
    );
  }

  async revokeSession(userId: string, sessionId: string): Promise<void> {
    await this.requireSessionEligibleUser(userId);
    const result = await this.prisma.authSession.updateMany({
      where: { id: sessionId, userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (!result.count)
      throw new BadRequestException({ code: 'SESSION_NOT_FOUND' });
  }

  async revokeOtherSessions(
    userId: string,
    currentSessionId?: string,
  ): Promise<{ revokedCount: number }> {
    await this.requireSessionEligibleUser(userId);
    if (!currentSessionId)
      throw new BadRequestException({ code: 'CURRENT_SESSION_REQUIRED' });
    const result = await this.prisma.authSession.updateMany({
      where: { userId, id: { not: currentSessionId }, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { revokedCount: result.count };
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
      await tx.authSession.updateMany({
        where: { userId: current.userId, revokedAt: null },
        data: { revokedAt: now },
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

  async setupPassword(token: string, password: string): Promise<{ code: string }> {
    // Strip any non-hex characters that email clients may append
    const cleanToken = token.replace(/[^a-f0-9]/gi, '');
    const tokenHash = this.hashToken(cleanToken);
    const record = await this.prisma.providerSetupToken.findUnique({
      where: { tokenHash },
      include: { user: { include: AUTH_USER_INCLUDE } },
    });
    if (!record || record.usedAt || record.expiresAt <= new Date()) {
      throw new BadRequestException({ code: 'INVALID_SETUP_TOKEN' });
    }
    const hashed = await bcrypt.hash(password, BCRYPT_ROUNDS);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: { password: hashed },
      }),
      this.prisma.providerSetupToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
    ]);
    return { code: 'PASSWORD_SET' };
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

  private async signTokens(
    user: AuthUser,
    context: SessionContext = {},
    existingSessionId?: string,
    expectedHash?: string,
  ): Promise<AuthTokens> {
    const placeholder = randomBytes(32).toString('hex');
    const session = existingSessionId
      ? { id: existingSessionId }
      : await this.prisma.authSession.create({
          data: {
            userId: user.id,
            refreshTokenHash: placeholder,
            deviceName: context.deviceName,
            userAgent: context.userAgent?.slice(0, 500),
            ipAddress: context.ipAddress?.slice(0, 64),
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        });
    const payload = {
      sub: user.id,
      email: user.email,
      roles: user.roles.map(({ role }) => role),
      sid: session.id,
    };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload),
      this.jwt.signAsync(payload, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get('JWT_REFRESH_EXPIRES', '7d'),
        jwtid: randomBytes(16).toString('hex'),
      }),
    ]);
    const decoded = this.jwt.decode(refreshToken) as { exp?: number };
    const update = await this.prisma.authSession.updateMany({
      where: {
        id: session.id,
        userId: user.id,
        revokedAt: null,
        ...(expectedHash
          ? { refreshTokenHash: expectedHash }
          : { refreshTokenHash: placeholder }),
      },
      data: {
        refreshTokenHash: this.hashToken(refreshToken),
        lastUsedAt: new Date(),
        expiresAt: new Date((decoded.exp ?? 0) * 1000),
      },
    });
    if (update.count !== 1)
      throw new UnauthorizedException('Invalid refresh token');
    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshToken },
    });
    return { accessToken, refreshToken };
  }

  private async requireSessionEligibleUser(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: AUTH_USER_INCLUDE,
    });
    if (!user) throw new UnauthorizedException();
    this.assertCanAuthenticate(user);
    this.assertTwoFactorEligible(user);
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

  private async deliverReset(
    _userId: string,
    email: string,
    token: string,
  ): Promise<void> {
    const base = this.config.get<string>(
      'PASSWORD_RESET_URL',
      'http://localhost:3000/reset-password',
    );
    const url = new URL(base);
    url.searchParams.set('token', token);
    await this.resend.sendPasswordReset(email, url.toString());
  }

}
