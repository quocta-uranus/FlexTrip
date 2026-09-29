/**
 * Reset mat khau cho user (local dev helper).
 *
 * Usage:
 *   cd d:\do an\flextrip1\be
 *   npx tsx scripts/reset-password.ts <email> [newPassword]
 *
 * Mac dinh newPassword = Test@1234
 */

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const [, , email, newPassword = 'Test@1234'] = process.argv;

  if (!email) {
    console.error('Usage: npx tsx scripts/reset-password.ts <email> [newPassword]');
    process.exit(1);
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`Khong tim thay user voi email: ${email}`);
    process.exit(1);
  }

  const hashed = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashed },
  });

  console.log(`Da reset mat khau cho ${email}.`);
  console.log('Dang nhap voi password moi (da hash trong DB, khong in ra terminal).');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
