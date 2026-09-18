/**
 * Test xem password hash trong DB co match voi "Test@1234" khong.
 * Khong in password hay hash ra terminal.
 *
 * Usage:
 *   cd d:\do an\flextrip1\be
 *   npx tsx scripts/check-password.ts <email> [candidatePassword]
 */

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const [, , email, candidate = 'Test@1234'] = process.argv;

  if (!email) {
    console.error('Usage: npx tsx scripts/check-password.ts <email> [candidatePassword]');
    process.exit(1);
  }

  const user = await prisma.user.findUnique({
    where: { email },
    include: { roles: true },
  });

  if (!user) {
    console.error('USER_NOT_FOUND');
    process.exit(2);
  }

  const stored = user.password ?? '';
  const looksLikeBcrypt =
    typeof stored === 'string' && stored.startsWith('$2') && stored.length >= 50;

  console.log(`user_id: ${user.id}`);
  console.log(`user_name: ${user.name}`);
  console.log(`roles: ${user.roles.map((r) => r.role).join(',')}`);
  console.log(`password_length: ${stored.length}`);
  console.log(`password_format: ${looksLikeBcrypt ? 'bcrypt-like' : 'NOT-bcrypt'}`);
  console.log(`first_8_chars: ${stored.slice(0, 8)}...`);

  if (!looksLikeBcrypt) {
    console.error('INVALID_HASH_FORMAT - can khong phai bcrypt hash, can reset lai password');
    process.exit(3);
  }

  const ok = await bcrypt.compare(candidate, stored);
  console.log(`compare_result: ${ok ? 'MATCH' : 'MISMATCH'}`);
  process.exit(ok ? 0 : 4);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
