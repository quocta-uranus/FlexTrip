---
title: Register and verify email
description: Create a FlexTrip Traveler account and verify its email address.
category: API
order: 1
---

# Register and verify email

All routes use the backend prefix `/api/v1/auth`. Public registration never accepts a role and always grants only `TRAVELER`.

## Register

`POST /api/v1/auth/register`

Request:

```json
{
  "name": "Traveler",
  "email": "traveler@example.com",
  "password": "Valid password 123!"
}
```

The API trims the name, trims and lowercases the email, and never trims the password. Unknown fields are rejected. Passwords must contain 8 or more characters and no more than 72 UTF-8 bytes.

Successful SMTP acceptance returns HTTP 201:

```json
{
  "code": "REGISTRATION_PENDING_VERIFICATION",
  "message": "Account created. Verification email accepted by SMTP; verify your email before signing in.",
  "nextAction": "VERIFY_EMAIL"
}
```

If the database commits but SMTP fails, the account, Traveler role and token remain valid. HTTP 201 returns:

```json
{
  "code": "REGISTRATION_CREATED_EMAIL_SEND_FAILED",
  "message": "Account created, but verification email could not be sent. Request another email after 60 seconds.",
  "nextAction": "RESEND_VERIFICATION",
  "retryAfterSeconds": 60
}
```

An existing normalized email returns HTTP 409. Validation returns 400 and an IP rate limit returns 429.

## Verify email

`POST /api/v1/auth/verify-email`

```json
{ "token": "<64-character token from the frontend verification URL>" }
```

HTTP 200 returns `{"code":"EMAIL_VERIFIED"}`. Invalid, expired, used or invalidated tokens share HTTP 400 and `INVALID_VERIFICATION_TOKEN`. Verification does not log the user in or grant another role.

## Resend verification

`POST /api/v1/auth/resend-verification`

```json
{ "email": "traveler@example.com" }
```

The response is always HTTP 202 with `VERIFICATION_EMAIL_REQUEST_ACCEPTED` for an unknown email, a verified account, cooldown, SMTP failure, or an accepted send. This avoids disclosing account state. A valid unverified account can create one new request every 60 seconds.

## Frontend contract

The email link is `EMAIL_VERIFICATION_URL?token=...`. Opening it does not consume the token; the frontend must POST it to `verify-email`. Authentication responses use `roles: Role[]` and verified time is represented by `emailVerifiedAt`.

## Migration note

Existing `isVerified=true` users receive the migration timestamp because no historical verification time exists. Existing Providers keep `PROVIDER` and gain `TRAVELER`; existing Admins retain only `ADMIN`.
