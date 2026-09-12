---
title: Forgot and reset password
description: Request a password recovery email and set a new password.
category: API
order: 3
---

# Forgot and reset password

## Request reset email

`POST /api/v1/auth/forgot-password`

```json
{ "email": "traveler@example.com" }
```

The endpoint always returns HTTP 202 with `PASSWORD_RESET_REQUEST_ACCEPTED` for unknown email, an ADMIN-only account, cooldown, SMTP failure or an accepted send. Eligible accounts can create one request every 60 seconds.

The email contains `{PASSWORD_RESET_URL}?token=...`. The frontend reads the token and sends it to the reset endpoint. Opening the link alone does not consume it.

## Reset password

`POST /api/v1/auth/reset-password`

```json
{
  "token": "<64-character-token>",
  "newPassword": "New password 123!"
}
```

The password must contain at least 8 characters and no more than 72 UTF-8 bytes. HTTP 200 returns `PASSWORD_RESET_SUCCESS`. Invalid, expired, used and invalidated tokens return HTTP 400 with `INVALID_PASSWORD_RESET_TOKEN`.

Reset succeeds only once, invalidates the user's remaining reset tokens and clears the stored refresh token. The user must sign in again with the new password.
