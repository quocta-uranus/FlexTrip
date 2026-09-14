export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface TwoFactorChallenge {
  requiresTwoFactor: true;
  challengeToken: string;
}

export type LoginResult = AuthTokens | TwoFactorChallenge;

export function isTwoFactorChallenge(r: LoginResult): r is TwoFactorChallenge {
  return (r as TwoFactorChallenge).requiresTwoFactor === true;
}

export interface RegistrationResult {
  code: 'OTP_SENT' | 'OTP_SEND_FAILED';
  email: string;
  message: string;
}

export interface Session {
  id: string;
  deviceName: string | null;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: string;
  lastUsedAt: string;
  expiresAt: string;
  isCurrent?: boolean;
}

export interface TwoFactorSetup {
  secret: string;
  otpauthUrl: string;
  qrDataUrl: string;
}

export interface TwoFactorEnableResult {
  recoveryCodes: string[];
}
