import {
  Controller,
  Post,
  Body,
  HttpCode,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import {
  AuthService,
  AuthTokens,
  LoginResult,
  RegistrationResult,
} from './services/auth.service';
import {
  EmailDto,
  LoginDto,
  RefreshDto,
  RegisterDto,
  VerifyEmailDto,
  ResetPasswordDto,
  TwoFactorCodeDto,
  TwoFactorLoginDto,
} from './dto';
import {
  RegisterRateLimitGuard,
  ResendRateLimitGuard,
  VerifyRateLimitGuard,
  ForgotPasswordRateLimitGuard,
  ResetPasswordRateLimitGuard,
} from './guards/rate-limit.guard';
import {
  AccessTokenGuard,
  AuthenticatedRequest,
} from './guards/access-token.guard';

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
  login(@Body() dto: LoginDto): Promise<LoginResult> {
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

  @Post('forgot-password')
  @HttpCode(202)
  @UseGuards(ForgotPasswordRateLimitGuard)
  @ApiOperation({ summary: 'AUTH-03: Request a password reset email' })
  @ApiResponse({ status: 202, description: 'Generic accepted response' })
  forgotPassword(@Body() dto: EmailDto): Promise<{ code: string }> {
    return this.authService.forgotPassword(dto.email);
  }

  @Post('reset-password')
  @HttpCode(200)
  @UseGuards(ResetPasswordRateLimitGuard)
  @ApiOperation({ summary: 'AUTH-03: Reset password with a single-use token' })
  @ApiResponse({ status: 200, description: 'Password reset; sign in again' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  resetPassword(@Body() dto: ResetPasswordDto): Promise<{ code: string }> {
    return this.authService.resetPassword(dto.token, dto.newPassword);
  }

  @Post('2fa/setup')
  @UseGuards(AccessTokenGuard)
  @ApiOperation({ summary: 'AUTH-04: Create a TOTP setup secret' })
  setupTwoFactor(@Req() request: AuthenticatedRequest) {
    return this.authService.setupTwoFactor(request.authUserId);
  }

  @Post('2fa/enable')
  @UseGuards(AccessTokenGuard)
  @ApiOperation({ summary: 'AUTH-04: Enable TOTP and issue recovery codes' })
  enableTwoFactor(
    @Req() request: AuthenticatedRequest,
    @Body() dto: TwoFactorCodeDto,
  ) {
    return this.authService.enableTwoFactor(request.authUserId, dto.code);
  }

  @Post('2fa/verify')
  @HttpCode(200)
  @ApiOperation({ summary: 'AUTH-04: Complete a two-factor login challenge' })
  verifyTwoFactor(@Body() dto: TwoFactorLoginDto): Promise<AuthTokens> {
    return this.authService.verifyTwoFactorLogin(dto.challengeToken, dto.code);
  }

  @Post('2fa/disable')
  @UseGuards(AccessTokenGuard)
  @ApiOperation({ summary: 'AUTH-04: Disable TOTP and revoke refresh token' })
  disableTwoFactor(
    @Req() request: AuthenticatedRequest,
    @Body() dto: TwoFactorCodeDto,
  ) {
    return this.authService.disableTwoFactor(request.authUserId, dto.code);
  }
}
