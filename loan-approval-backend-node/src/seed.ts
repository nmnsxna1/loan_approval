import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { backendLogger } from './utils/logger';

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.user.findFirst();
  if (existing) {
    backendLogger.info('Users already exist, skipping seed', { file: 'src/seed.ts' });
    return;
  }

  const password = await bcrypt.hash('password123', 10);

  await prisma.user.createMany({
    data: [
      { username: 'applicant1', email: 'applicant1@example.com', password, role: 'APPLICANT' },
      { username: 'policymgr1', email: 'policymgr1@example.com', password, role: 'POLICY_MANAGER' },
      { username: 'mainmgr1', email: 'mainmgr1@example.com', password, role: 'MAIN_MANAGER' },
    ],
  });

  backendLogger.info('Seed users created successfully', { file: 'src/seed.ts' });
}

main()
  .catch((e) => backendLogger.error('Seed failed', { file: 'src/seed.ts', message: e.message, stack: e.stack }))
  .finally(() => prisma.$disconnect());
