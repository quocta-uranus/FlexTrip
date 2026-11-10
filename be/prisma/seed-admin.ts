import { PrismaClient, Role, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const EMAIL = process.env.SEED_ADMIN_EMAIL ?? 'admin@flextrip.dev';
const PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'Admin@123456';

async function main() {
  if (process.env.NODE_ENV === 'production' && !process.env.SEED_ADMIN_PASSWORD) {
    throw new Error('Set SEED_ADMIN_PASSWORD to seed an admin in production');
  }

  const password = await bcrypt.hash(PASSWORD, 10);

  // Re-running resets the password and re-activates the account
  const user = await prisma.user.upsert({
    where: { email: EMAIL },
    update: { password, status: UserStatus.ACTIVE, emailVerifiedAt: new Date() },
    create: {
      email: EMAIL,
      name: 'FlexTrip Admin',
      password,
      status: UserStatus.ACTIVE,
      emailVerifiedAt: new Date(),
      roles: { create: [{ role: Role.ADMIN }] },
      adminProfile: {
        create: { employeeId: 'EMP-AD-0001', department: 'TRUST_SAFETY', level: 'L2' },
      },
    },
  });

  await prisma.userRole.upsert({
    where: { userId_role: { userId: user.id, role: Role.ADMIN } },
    update: {},
    create: { userId: user.id, role: Role.ADMIN },
  });

  console.log(`Admin ready: ${EMAIL} / ${PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
