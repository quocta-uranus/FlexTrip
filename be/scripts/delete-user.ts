/**
 * Xoa user theo email (local dev helper).
 *
 * Usage:
 *   cd d:\do an\flextrip1\be
 *   npx tsx scripts/delete-user.ts <email>
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error('Usage: npx tsx scripts/delete-user.ts <email>');
    process.exit(1);
  }

  const user = await prisma.user.findUnique({
    where: { email },
    include: { roles: true },
  });

  if (!user) {
    console.error(`Khong tim thay user: ${email}`);
    process.exit(1);
  }

  await prisma.$transaction(async (tx) => {
    await tx.userRole.deleteMany({ where: { userId: user.id } });
    await tx.user.delete({ where: { id: user.id } });
  });

  console.log(`Da xoa user ${email} (id=${user.id}, roles=${user.roles.map((r) => r.role).join(',')})`);
  console.log('Bay gio co the chay create-provider de tao lai.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
