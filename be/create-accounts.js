const { Client } = require('pg');
const bcrypt = require('bcrypt');

const BCRYPT_ROUNDS = 12;

async function main() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'flextrip',
    password: 'flextrip',
    database: 'flextrip_db',
  });

  await client.connect();

  // Cleanup any previous attempts
  await client.query(
    `DELETE FROM "UserRole" WHERE "userId" IN (SELECT id FROM "User" WHERE email IN ($1, $2))`,
    ['traveler@flextrip.test', 'provider@flextrip.test'],
  );
  await client.query(
    `DELETE FROM "User" WHERE email IN ($1, $2)`,
    ['traveler@flextrip.test', 'provider@flextrip.test'],
  );

  // ============ TRAVELER ============
  const travelerPw = await bcrypt.hash('Traveler@123', BCRYPT_ROUNDS);
  const traveler = await client.query(
    `INSERT INTO "User" (
      id, email, password, name, "emailVerifiedAt", "verificationRequestedAt",
      "isKycVerified", status, "twoFactorEnabled", "twoFactorRecoveryCodes",
      languages, "preferredLanguage", "createdAt", "updatedAt"
    ) VALUES (
      gen_random_uuid()::text, $1, $2, $3, NOW(), NOW(),
      false, 'ACTIVE', false, '{}',
      ARRAY['vi']::text[], 'vi', NOW(), NOW()
    ) RETURNING id, email, name`,
    ['traveler@flextrip.test', travelerPw, 'Nguyen Van Traveler'],
  );
  const travelerId = traveler.rows[0].id;

  await client.query(
    `INSERT INTO "UserRole" ("userId", role) VALUES ($1, 'TRAVELER')`,
    [travelerId],
  );

  await client.query(
    `INSERT INTO "Wallet" ("walletId", "userId", balance, currency, "updatedAt")
     VALUES (gen_random_uuid()::text, $1, 0, 'VND', NOW())`,
    [travelerId],
  );

  // ============ PROVIDER ============
  const providerPw = await bcrypt.hash('Provider@123', BCRYPT_ROUNDS);
  const provider = await client.query(
    `INSERT INTO "User" (
      id, email, password, name, "emailVerifiedAt", "verificationRequestedAt",
      "isKycVerified", status, "twoFactorEnabled", "twoFactorRecoveryCodes",
      languages, "preferredLanguage", "createdAt", "updatedAt"
    ) VALUES (
      gen_random_uuid()::text, $1, $2, $3, NOW(), NOW(),
      false, 'ACTIVE', false, '{}',
      ARRAY['vi']::text[], 'vi', NOW(), NOW()
    ) RETURNING id, email, name`,
    ['provider@flextrip.test', providerPw, 'Tran Thi Provider'],
  );
  const providerId = provider.rows[0].id;

  await client.query(
    `INSERT INTO "UserRole" ("userId", role) VALUES ($1, 'PROVIDER')`,
    [providerId],
  );

  // ProviderProfile
  await client.query(
    `INSERT INTO "ProviderProfile" (
      id, "userId", "shopName", "ownerName", category, "pickupAddress",
      "responseHours", bio, highlights, "isLive",
      "itemsCount", "rentalsCount", "ratingAvg", "reviewsCount", "responseTimeH",
      "createdAt", "updatedAt"
    ) VALUES (
      gen_random_uuid()::text, $1, $2, $3, 'VEHICLE', $4,
      '24 giờ', 'Chuyên cho thuê xe máy và ô tô tự lái tại Đà Lạt', ARRAY['Xe mới','Giao tận nơi','Bảo hiểm đầy đủ']::text[], true,
      0, 0, 0, 0, 24,
      NOW(), NOW()
    )`,
    [
      providerId,
      'Tran Thi Provider Shop',
      'Tran Thi Provider',
      '12 Trần Phú, Đà Lạt, Lâm Đồng',
    ],
  );

  await client.query(
    `INSERT INTO "Wallet" ("walletId", "userId", balance, currency, "updatedAt")
     VALUES (gen_random_uuid()::text, $1, 0, 'VND', NOW())`,
    [providerId],
  );

  console.log('\n========================================');
  console.log('✅ TẠO TÀI KHOẢN THÀNH CÔNG');
  console.log('========================================\n');
  console.log('🧳 TRAVELER:');
  console.log('   Email:    traveler@flextrip.test');
  console.log('   Password: Traveler@123');
  console.log('   User ID:  ' + travelerId);
  console.log('   Role:     TRAVELER');
  console.log('');
  console.log('🏪 PROVIDER:');
  console.log('   Email:    provider@flextrip.test');
  console.log('   Password: Provider@123');
  console.log('   User ID:  ' + providerId);
  console.log('   Role:     PROVIDER (with ProviderProfile VEHICLE)');
  console.log('\n========================================');
  console.log('Đã verified email + active. Có thể login ngay.');
  console.log('========================================\n');

  await client.end();
}

main().catch((err) => {
  console.error('❌ Lỗi:', err.message);
  process.exit(1);
});
