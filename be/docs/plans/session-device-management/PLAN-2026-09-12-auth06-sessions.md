# AUTH-06 — Session & Device Management

Traveler and Provider accounts may keep independent sessions on multiple devices. Each session stores only a SHA-256 refresh-token hash, device label, user agent, IP address, activity timestamps, expiry and revocation time.

## API

- `GET /api/v1/auth/sessions` lists active sessions and marks the current session.
- `DELETE /api/v1/auth/sessions/:id` revokes one session owned by the caller.
- `DELETE /api/v1/auth/sessions/others` revokes all sessions except the current one.
- Login accepts optional `deviceName`; refresh rotates only its own session; logout revokes its matching session.

Password reset and disabling 2FA revoke every active session. Authorization reads the current account status, email verification and roles from PostgreSQL. Admin-only accounts cannot use this user-facing feature.

The additive migration keeps `User.refreshToken` temporarily. A valid token issued before AUTH-06 becomes an `AuthSession` when refreshed, so deployment does not force an immediate logout.

## Postman

Login twice with different `deviceName` values and save both token pairs. Use the latest access token as Bearer authentication for the three session endpoints. After revoking a session, its refresh token must return `401`; refresh tokens belonging to sessions that were not revoked must still work.
