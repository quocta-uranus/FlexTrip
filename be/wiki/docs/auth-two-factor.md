---
title: Two-factor authentication
description: Protect Traveler and Provider accounts with an authenticator application.
category: API
order: 4
---

# Two-factor authentication

Use a Bearer access token for setup, enable and disable requests.

1. `POST /api/v1/auth/2fa/setup` returns `secret` and `otpauthUrl`.
2. Add the URI to Google or Microsoft Authenticator.
3. `POST /api/v1/auth/2fa/enable` with `{ "code": "123456" }` returns eight recovery codes once. Store them securely.
4. Later password login returns `{ "requiresTwoFactor": true, "challengeToken": "..." }` without access or refresh tokens.
5. `POST /api/v1/auth/2fa/verify` with the challenge and a TOTP or recovery code returns access and refresh tokens.

```json
{
  "challengeToken": "<five-minute-challenge>",
  "code": "123456"
}
```

Disable with `POST /api/v1/auth/2fa/disable` and `{ "code": "123456" }`. This removes the secret and recovery codes and revokes the current refresh token. TOTP is available to accounts with Traveler or Provider role; ADMIN-only accounts cannot enroll.
