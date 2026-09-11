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
import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../../prisma/prisma.service';
import { RegisterDto, LoginDto } from '../dto';
import { MailService } from './mail.service';

export const VERIFICATION_TTL_MS = 30 * 60 * 1000;
export const RESEND_COOLDOWN_MS = 60 * 1000;
const BCRYPT_ROUNDS = 10;
const AUTH_USER_INCLUDE = { roles: true } as const;
type AuthUser = Prisma.UserGetPayload<{ include: typeof AUTH_USER_INCLUDE }>;
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}
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

  async login(dto: LoginDto): Promise<AuthTokens> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: AUTH_USER_INCLUDE,
    });
    if (!user || !(await bcrypt.compare(dto.password, user.password)))
      throw new UnauthorizedException('Invalid credentials');
    this.assertCanAuthenticate(user);
    return this.signTokens(user);
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
}
