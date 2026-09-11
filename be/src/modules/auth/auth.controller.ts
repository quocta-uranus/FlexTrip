import { Controller, Post, Body, HttpCode, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import {
  AuthService,
  AuthTokens,
  RegistrationResult,
} from './services/auth.service';
import {
  EmailDto,
  LoginDto,
  RefreshDto,
  RegisterDto,
  VerifyEmailDto,
} from './dto';
import {
  RegisterRateLimitGuard,
  ResendRateLimitGuard,
  VerifyRateLimitGuard,
} from './guards/rate-limit.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @UseGuards(RegisterRateLimitGuard)
  @ApiOperation({ summary: 'AUTH-01: Register an unverified Traveler' })
  @ApiResponse({
    status: 201,
    description:
      'Account created; inspect code for SMTP outcome. No login tokens.',
  })
  @ApiResponse({ status: 409, description: 'Email already registered' })
  @ApiResponse({
    status: 400,
    description: 'Invalid input or forbidden fields',
  })
  @ApiResponse({ status: 429, description: 'IP request limit exceeded' })
  register(@Body() dto: RegisterDto): Promise<RegistrationResult> {
    return this.authService.register(dto);
  }

  @Post('verify-email')
  @HttpCode(200)
  @UseGuards(VerifyRateLimitGuard)
  @ApiOperation({ summary: 'AUTH-01: Verify email with a single-use token' })
  @ApiResponse({
    status: 200,
    description: 'Email verified; sign in separately',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid, expired or consumed token',
  })
  verify(@Body() dto: VerifyEmailDto): Promise<{ code: string }> {
    return this.authService.verifyEmail(dto.token);
  }

  @Post('resend-verification')
  @HttpCode(202)
  @UseGuards(ResendRateLimitGuard)
  @ApiOperation({
    summary:
      'AUTH-01: Request verification email; response does not confirm delivery',
  })
  @ApiResponse({
    status: 202,
    description: 'Generic response, including cooldown and SMTP failure',
  })
  resend(@Body() dto: EmailDto): Promise<{ code: string }> {
    return this.authService.resendVerification(dto.email);
  }

  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'AUTH-02: Login (active, verified accounts only)' })
  login(@Body() dto: LoginDto): Promise<AuthTokens> {
    return this.authService.login(dto);
  }

  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({
    summary: 'AUTH-02: Refresh using current account state and roles',
  })
  refresh(@Body() dto: RefreshDto): Promise<AuthTokens> {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(204)
  @ApiOperation({
    summary: 'AUTH-02: Revoke the current refresh token',
  })
  @ApiResponse({
    status: 204,
    description:
      'Logout is idempotent and does not disclose whether the token existed',
  })
  @ApiResponse({ status: 400, description: 'Invalid request body' })
  async logout(@Body() dto: RefreshDto): Promise<void> {
    await this.authService.logout(dto.refreshToken);
  }
}
