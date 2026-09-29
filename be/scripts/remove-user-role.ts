import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  const roleToRemove = (process.argv[3] ?? 'TRAVELER').toUpperCase() as Role;

  if (!email) {
    console.error('Usage: npx tsx scripts/remove-user-role.ts <email> [ROLE]');
    process.exit(1);
  }

  const user = await prisma.user.findUnique({
    where: { email },
    include: { roles: true },
  });

  if (!user) {
    console.error(`Khong tim thay user voi email: ${email}`);
    process.exit(1);
  }

  console.log(`User: ${user.name} <${user.email}>`);
  console.log(`Roles hien tai: ${user.roles.map((r) => r.role).join(', ')}`);

  if (user.roles.length <= 1) {
    console.log('User chi co 1 role - KHONG co gi de xoa. Bo qua.');
    return;
  }

  const target = user.roles.find((r) => r.role === roleToRemove);
  if (!target) {
    console.log(`User khong co role ${roleToRemove}. Bo qua.`);
    return;
  }

  await prisma.userRole.delete({
    where: { userId_role: { userId: user.id, role: roleToRemove } },
  });

  console.log(`Da xoa role ${roleToRemove} cua user ${email}.`);
  console.log('Hay bat user logout/login lai de JWT cap nhat role.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
