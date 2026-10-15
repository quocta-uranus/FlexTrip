import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './services/auth.service';
import { OtpService } from './services/otp.service';
import { ResendService } from './services/resend.service';
import {
  RegisterRateLimitGuard,
  ForgotPasswordRateLimitGuard,
  ResetPasswordRateLimitGuard,
} from './guards/rate-limit.guard';
import { AccessTokenGuard } from './guards/access-token.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

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
    RegisterRateLimitGuard,
    ForgotPasswordRateLimitGuard,
    ResetPasswordRateLimitGuard,
    AccessTokenGuard,
    RolesGuard,
  ],
  exports: [AuthService, ResendService, JwtModule, AccessTokenGuard, RolesGuard],
})
export class AuthModule {}
