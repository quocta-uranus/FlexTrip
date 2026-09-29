const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

p.user.findMany({ select: { email: true, emailVerifiedAt: true, status: true, name: true } })
  .then(r => {
    console.log(JSON.stringify(r, null, 2));
    p.$disconnect();
    process.exit(0);
  })
  .catch(e => {
    console.error(e);
    p.$disconnect();
    process.exit(1);
  });
