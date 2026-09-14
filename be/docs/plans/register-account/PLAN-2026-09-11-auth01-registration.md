# Plan: AUTH-01 Email Registration

**Type:** FEATURE
**Branch:** feat/register-account
**Domain:** src/modules/auth
**Created:** 2026-09-11
**Status:** ✅ Done

## Summary

Create unverified Traveler accounts, send a single-use verification link through SMTP, verify email before authentication, and resend verification without account enumeration.

## Completed tasks

- [x] Replace single role with UserRole and migrate existing roles safely.
- [x] Replace isVerified with emailVerifiedAt and add account status.
- [x] Create User, Traveler role and verification token atomically.
- [x] Send SMTP outside the transaction and preserve the account on delivery failure.
- [x] Add register, verify-email and resend-verification APIs with DTO validation and rate limits.
- [x] Make login/refresh check current status, email verification and database roles.
- [x] Add four isolated test groups and API documentation.

## Acceptance criteria

- [x] New public accounts receive only TRAVELER.
- [x] Verification tokens are hashed, expire in 30 minutes and are single-use.
- [x] SMTP failure retains the account and directs the client to resend.
- [x] Existing users and roles survive migration.
- [x] Tests, build and lint pass.
