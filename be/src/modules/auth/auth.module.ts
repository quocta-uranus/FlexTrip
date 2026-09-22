import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import { AuthController } from './auth.controller';
import { AuthService } from './services/auth.service';
import { OtpService, REDIS_CLIENT } from './services/otp.service';
import { ResendService } from './services/resend.service';
import {
  RegisterRateLimitGuard,
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
    OtpService,
    ResendService,
    {
      provide: REDIS_CLIENT,
      useFactory: (config: ConfigService) =>
        new Redis({
          host: config.get<string>('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
        }),
      inject: [ConfigService],
    },
    RegisterRateLimitGuard,
    ForgotPasswordRateLimitGuard,
    ResetPasswordRateLimitGuard,
    AccessTokenGuard,
  ],
  exports: [AuthService, ResendService, JwtModule],
})
export class AuthModule {}
