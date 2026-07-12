import 'dotenv/config';
import { PrismaClient } from '../app/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const result = await prisma.user.updateMany({
    where: {
      role: 'DISPATCHER',
      driverId: { not: null },
    },
    data: { role: 'DRIVER' },
  });
  console.log(`✅ Updated ${result.count} driver user(s) to DRIVER role`);
}

main().finally(() => prisma.$disconnect());
