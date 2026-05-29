const { PrismaClient } = require('@prisma/client');
const { PrismaNeon } = require('@prisma/adapter-neon');

async function main() {
  const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });
  try {
    const users = await prisma.user.findMany({ take: 20, select: { id: true, name: true, email: true } });
    const members = await prisma.organizationMember.findMany({
      take: 20,
      include: { user: { select: { name: true, email: true } } },
    });
    console.log('=== USERS ===');
    console.log(JSON.stringify(users, null, 2));
    console.log('=== MEMBERS (with role) ===');
    console.log(JSON.stringify(members, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}
main();
