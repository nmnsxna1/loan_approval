import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import app from './app';
import { backendLogger, dbLogger, errorLogger } from './utils/logger';

dotenv.config();

const prisma = new PrismaClient();
const PORT = process.env.PORT || 8080;

async function main() {
  await prisma.$connect();
  dbLogger.info('Connected to database', { file: 'src/index.ts' });

  app.listen(PORT, () => {
    backendLogger.info(`Server running on http://localhost:${PORT}`, {
      file: 'src/index.ts',
      function: 'main',
    });
  });
}

main().catch((err) => {
  errorLogger.fatal('Failed to start server', {
    file: 'src/index.ts',
    function: 'main',
    message: err.message,
    stack: err.stack,
  });
  process.exit(1);
});

process.on('SIGINT', () => {
  backendLogger.info('Server shutting down (SIGINT)', { file: 'src/index.ts' });
  prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', () => {
  backendLogger.info('Server shutting down (SIGTERM)', { file: 'src/index.ts' });
  prisma.$disconnect();
  process.exit(0);
});
