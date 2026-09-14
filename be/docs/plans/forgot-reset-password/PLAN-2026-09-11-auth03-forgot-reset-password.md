# Plan: AUTH-03 Forgot and Reset Password

**Type:** FEATURE
**Branch:** feat/forgot-reset-password
**Domain:** src/modules/auth
**Created:** 2026-09-11
**Status:** ✅ Done

> Let Travelers and Providers recover an email/password account without disclosing whether an address exists.

## Scope

- Add forgot-password and reset-password endpoints.
- Store only hashed, single-use reset tokens with a 30-minute lifetime.
- Apply a 60-second atomic request cooldown and send SMTP after commit.
- Reset the password transactionally and revoke the current refresh token.
- Keep ADMIN-only recovery, social accounts and session management out of scope.

## Acceptance Criteria

- [x] Unknown, ineligible and cooldown requests share HTTP 202.
- [x] SMTP failure retains the account, token and cooldown.
- [x] Invalid, expired, used and invalidated tokens share HTTP 400.
- [x] Concurrent reset permits one successful request.
- [x] Password is hashed and existing refresh token is revoked.
- [x] Tests, Prisma validation, build and lint pass.
