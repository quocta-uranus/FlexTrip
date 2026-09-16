-- Cleanup any previous provider test
DELETE FROM "Wallet"            WHERE "userId" IN (SELECT id FROM "User" WHERE email = 'provider@flextrip.test');
DELETE FROM "ProviderProfile" WHERE "userId" IN (SELECT id FROM "User" WHERE email = 'provider@flextrip.test');
DELETE FROM "UserRole"         WHERE "userId" IN (SELECT id FROM "User" WHERE email = 'provider@flextrip.test');
DELETE FROM "User"             WHERE email = 'provider@flextrip.test';

-- Insert Provider user (cùng hash bcrypt của Traveler@123)
INSERT INTO "User" (
  id, email, password, name,
  "emailVerifiedAt", "verificationRequestedAt",
  "isKycVerified", status,
  "twoFactorEnabled", "twoFactorRecoveryCodes",
  languages, "preferredLanguage",
  "createdAt", "updatedAt"
) VALUES (
  'prov-' || gen_random_uuid()::text,
  'provider@flextrip.test',
  '$2b$12$tnm3.4xenl87ha2IsOs39eQaWEt.Zuf9ScP4s8GW.qOYDxlfqYV3i',
  'Tran Thi Provider',
  NOW(), NOW(),
  false, 'ACTIVE',
  false, ARRAY[]::text[],
  ARRAY['vi']::text[], 'vi',
  NOW(), NOW()
);

-- Insert role PROVIDER
INSERT INTO "UserRole" ("userId", role)
SELECT id, 'PROVIDER' FROM "User" WHERE email = 'provider@flextrip.test';

-- Insert ProviderProfile
INSERT INTO "ProviderProfile" (
  id, "userId", "shopName", "ownerName", category, "pickupAddress",
  "responseHours", bio, highlights, "isLive",
  "itemsCount", "rentalsCount", "ratingAvg", "reviewsCount", "responseTimeH",
  "createdAt", "updatedAt"
)
SELECT
  'pp-' || gen_random_uuid()::text,
  id, 'Tran Thi Provider Shop', 'Tran Thi Provider', 'VEHICLE',
  '12 Trần Phú, Đà Lạt, Lâm Đồng',
  '24 giờ', 'Chuyên cho thuê xe máy và ô tô tự lái tại Đà Lạt',
  ARRAY['Xe mới','Giao tận nơi','Bảo hiểm đầy đủ']::text[],
  true, 0, 0, 0, 0, 24,
  NOW(), NOW()
FROM "User" WHERE email = 'provider@flextrip.test';

-- Insert wallet
INSERT INTO "Wallets" ("walletId", "userId", balance, currency, "updatedAt")
SELECT 'w-' || gen_random_uuid()::text, id, 0, 'VND', NOW()
FROM "User" WHERE email = 'provider@flextrip.test';

-- Verify
SELECT u.email, u.name, ur.role, pp."shopName", pp.category
FROM "User" u
LEFT JOIN "UserRole" ur ON ur."userId" = u.id
LEFT JOIN "ProviderProfile" pp ON pp."userId" = u.id
WHERE u.email IN ('traveler@flextrip.test', 'provider@flextrip.test')
ORDER BY u.email, ur.role;
