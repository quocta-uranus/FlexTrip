# Plan: AUTH-02 Login, Refresh and Logout

**Type:** FEATURE
**Branch:** feat/login-logout
**Domain:** src/modules/auth
**Created:** 2026-09-11
**Status:** ✅ Done

> Complete the existing email/password authentication flow with an idempotent logout endpoint that revokes the currently stored refresh token.

---

## Scope

- Keep login and refresh responses compatible with AUTH-01.
- Add `POST /api/v1/auth/logout` with the refresh token in the request body.
- Revoke only a refresh token that is cryptographically valid and matches the current database value.
- Allow suspended or disabled accounts to revoke their token.
- Keep multi-device sessions and access-token denylisting out of scope.

## Tasks

- [x] Add logout service behavior and API endpoint.
- [x] Document idempotent response and validation behavior.
- [x] Test login, refresh rotation and logout revocation.
- [x] Run all tests, build and lint.

## Acceptance Criteria

- [x] Login requires correct credentials, active status, verified email and valid current roles.
- [x] Refresh reads current account state and roles from the database.
- [x] Logout clears the matching refresh token and returns HTTP 204.
- [x] Invalid, replaced and already revoked tokens receive the same idempotent response.
- [x] No token or credential is logged.
