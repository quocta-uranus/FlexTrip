SELECT id, email, name, "emailVerifiedAt" IS NOT NULL AS verified, password
FROM "User";
