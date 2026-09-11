---
title: Login, refresh and logout
description: Authenticate a verified FlexTrip account and revoke its current refresh token.
category: API
order: 2
---

# Login, refresh and logout

All routes use the `/api/v1/auth` prefix. Login and refresh require an `ACTIVE` account, a verified email and at least one valid role from the database.

## Login

`POST /api/v1/auth/login`

```json
{
  "email": "traveler@example.com",
  "password": "Valid password 123!"
}
```

HTTP 200 returns `accessToken` and `refreshToken`. Unknown email and an incorrect password share HTTP 401 with `Invalid credentials`. An unverified or non-active account returns HTTP 403.

## Refresh

`POST /api/v1/auth/refresh`

```json
{
  "refreshToken": "<current-refresh-token>"
}
```

HTTP 200 rotates both tokens. The server validates the signature and expiry, compares the token with the current database value, then reloads account status, verification and roles. A replaced, expired or invalid token returns HTTP 401.

## Logout

`POST /api/v1/auth/logout`

```json
{
  "refreshToken": "<current-refresh-token>"
}
```

Logout returns HTTP 204 without a response body. A matching token is removed from the user record. Invalid, replaced, expired and already revoked tokens receive the same response so the endpoint is idempotent and does not disclose session state. A suspended or disabled account can still revoke its current token.

After logout, the revoked refresh token can no longer be used at the refresh endpoint. The client must also remove its local access and refresh tokens.
