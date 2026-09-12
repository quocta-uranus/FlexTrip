import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './services/auth.service';
import { MailService, SMTP_TRANSPORT_FACTORY } from './services/mail.service';
import { createTransport } from 'nodemailer';
import {
  RegisterRateLimitGuard,
  ResendRateLimitGuard,
  VerifyRateLimitGuard,
  ForgotPasswordRateLimitGuard,
  ResetPasswordRateLimitGuard,
} from './guards/rate-limit.guard';
import { AccessTokenGuard } from './guards/access-token.guard';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_ACCESS_SECRET'),
        signOptions: { expiresIn: config.get('JWT_ACCESS_EXPIRES', '15m') },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    MailService,
    { provide: SMTP_TRANSPORT_FACTORY, useValue: createTransport },
    RegisterRateLimitGuard,
    ResendRateLimitGuard,
    VerifyRateLimitGuard,
    ForgotPasswordRateLimitGuard,
    ResetPasswordRateLimitGuard,
    AccessTokenGuard,
  ],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
