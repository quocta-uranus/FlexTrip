# Plan: AUTH-04 Two-Factor Authentication

**Type:** FEATURE
**Branch:** feat/two-factor-authentication
**Domain:** src/modules/auth
**Created:** 2026-09-12
**Status:** ✅ Done

> Add TOTP second-factor protection for Traveler and Provider accounts using authenticator applications and one-time recovery codes.

## Scope

- Authenticated setup, enable and disable endpoints.
- Five-minute login challenge before issuing access and refresh tokens.
- AES-256-GCM encrypted TOTP secret and hashed recovery codes.
- Eight recovery codes, each consumable once.
- SMS, email OTP and ADMIN-only enrollment are out of scope.

## Acceptance Criteria

- [x] Password login does not issue JWTs while 2FA is enabled.
- [x] Valid TOTP or unused recovery code completes the challenge.
- [x] Invalid access/challenge tokens and codes are rejected.
- [x] Disabling 2FA clears secret, recovery codes and refresh token.
- [x] Existing authentication behavior remains covered by tests.
