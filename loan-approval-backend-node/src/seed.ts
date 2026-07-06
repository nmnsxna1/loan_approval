import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.user.count();
  if (existing > 0) {
    console.log('Users already exist, skipping seed');
    return;
  }

  const password = await bcrypt.hash('123456', 10);

  await prisma.user.createMany({
    data: [
      { username: 'applicant', password, email: 'applicant@loan.com', role: 'APPLICANT' },
      { username: 'policy_manager', password, email: 'policy.manager@loan.com', role: 'POLICY_MANAGER' },
      { username: 'main_manager', password, email: 'main.manager@loan.com', role: 'MAIN_MANAGER' },
    ],
  });

  console.log('Seed users created successfully');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
