# AUTH-05 — Provider KYC Verification

## Business flow

1. An active, email-verified Traveler submits identity details and private object-storage URLs.
2. The application starts as `PENDING`. A user can have only one current application.
3. An active, email-verified Admin lists and reviews applications.
4. Approval sets `User.isKycVerified = true` and adds `PROVIDER` in the same transaction. `TRAVELER` is retained.
5. Rejection requires a reason and does not grant a role. The Traveler may correct and resubmit.

Users cannot request `PROVIDER` or `ADMIN` in the submission body. Every authorization decision reads current status, verification state and roles from PostgreSQL instead of trusting roles embedded in an older JWT.

## Data protection

- Document numbers are encrypted with AES-256-GCM using `KYC_ENCRYPTION_KEY`.
- A keyed HMAC fingerprint using `KYC_FINGERPRINT_SECRET` prevents one identity document from being claimed by different users.
- API responses for Travelers expose only the last four characters. Full identity details and document URLs are available only from the Admin review endpoint.
- This scope accepts URLs from an existing private upload service. Binary upload and signed URL generation remain part of the storage module.

## Endpoints

- `POST /api/v1/kyc/applications` — Traveler submits an application.
- `GET /api/v1/kyc/me` — Traveler or Provider reads their status.
- `GET /api/v1/kyc/applications?status=PENDING` — Admin lists applications.
- `PATCH /api/v1/kyc/applications/:id/review` — Admin approves or rejects.

All endpoints require `Authorization: Bearer <accessToken>`.

## Postman walkthrough

Set `baseUrl=http://localhost:3001/api/v1`, `travelerAccessToken`, `adminAccessToken`, and `applicationId` in the environment.

Submit with the Traveler token:

```json
{
  "legalName": "NGUYEN VAN AN",
  "documentType": "NATIONAL_ID",
  "documentNumber": "012345678901",
  "documentFrontUrl": "https://storage.example.com/kyc/front.jpg",
  "documentBackUrl": "https://storage.example.com/kyc/back.jpg",
  "selfieUrl": "https://storage.example.com/kyc/selfie.jpg"
}
```

Save the returned `id` as `applicationId`. List pending applications with the Admin token, then approve:

```json
{ "decision": "APPROVE" }
```

To test rejection, use a new pending application:

```json
{
  "decision": "REJECT",
  "rejectionReason": "Document image is unreadable"
}
```

Expected results: submission `201`, list/status `200`, review `200`, missing/invalid token `401`, insufficient/current invalid role `403`, duplicate pending or reviewed application `409`.
