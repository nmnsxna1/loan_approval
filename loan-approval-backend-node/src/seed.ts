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

  const password = await bcrypt.hash('123456', 10);

  await prisma.user.createMany({
    data: [
      { username: 'applicant', email: 'applicant@example.com', password, role: 'APPLICANT' },
      { username: 'policy_manager', email: 'policy@example.com', password, role: 'POLICY_MANAGER' },
      { username: 'main_manager', email: 'main@example.com', password, role: 'MAIN_MANAGER' },
    ],
  });

  backendLogger.info('Seed users created successfully', { file: 'src/seed.ts' });
}

main()
  .catch((e) => backendLogger.error('Seed failed', { file: 'src/seed.ts', message: e.message, stack: e.stack }))
  .finally(() => prisma.$disconnect());
