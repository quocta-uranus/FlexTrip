import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@flextrip.vn';
  const password = 'Admin@123456';

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log('Admin already exists:', email);
    await prisma.$disconnect();
    return;
  }

  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      email,
      name: 'Admin FlexTrip',
      password: hashed,
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
      roles: { create: { role: 'ADMIN' } },
    },
  });
  console.log('✅ Admin created:', user.email, '| Password:', password);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
