/**
 * Tao nhanh tai khoan chu shop (PROVIDER) de test.
 *
 * Mac dinh chi gan 1 role PROVIDER.
 * Them --traveler neu muon gan them role TRAVELER.
 *
 * Usage:
 *   cd d:\do an\flextrip1\be
 *   npx tsx scripts/create-provider.ts <email> <password> "<ho ten>" [phone] [--traveler]
 */

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const [, , email, password, fullName, phoneArg, ...flags] = process.argv;
  const addTraveler = flags.includes('--traveler');

  if (!email || !password || !fullName) {
    console.error(
      'Usage: npx tsx scripts/create-provider.ts <email> <password> "<ho ten>" [phone] [--traveler]',
    );
    process.exit(1);
  }

  const phone = phoneArg && !phoneArg.startsWith('--') ? phoneArg : null;

  const existing = await prisma.user.findUnique({
    where: { email },
    include: { roles: true },
  });

  if (existing) {
    console.error(`Email "${email}" da ton tai. User hien co cac role: ${existing.roles.map((r) => r.role).join(', ')}`);
    console.error('Mat khau dang luu trong DB khong the xem qua script nay.');
    console.error('Neu can reset, chay: npx tsx scripts/reset-password.ts <email> <newPassword>');
    process.exit(1);
  }

  const hashed = await bcrypt.hash(password, 10);

  const roles: Array<{ role: 'PROVIDER' | 'TRAVELER' }> = [{ role: 'PROVIDER' }];
  if (addTraveler) roles.push({ role: 'TRAVELER' });

  const user = await prisma.user.create({
    data: {
      email,
      password: hashed,
      name: fullName,
      phone: phone ?? null,
      isKycVerified: true,
      emailVerifiedAt: new Date(),
      status: 'ACTIVE',
      roles: { create: roles },
    },
    include: { roles: true },
  });

  console.log('');
  console.log('=== TAO PROVIDER THANH CONG ===');
  console.log(`  ID    : ${user.id}`);
  console.log(`  Email : ${user.email}`);
  console.log(`  Ten   : ${user.name}`);
  console.log(`  Phone : ${user.phone ?? '(chua co)'}`);
  console.log(`  Roles : ${user.roles.map((r) => r.role).join(', ')}`);
  console.log('');
  console.log(`Dang nhap voi email "${email}" va password ban vua nhap.`);
  console.log('');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
