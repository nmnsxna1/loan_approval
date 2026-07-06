import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import authRoutes from './routes/auth';
import applicationRoutes from './routes/applications';
import uploadRoutes from './routes/upload';
import { errorHandler } from './middleware/errorHandler';
import { info, error as logError } from './utils/logger';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 8080;

app.use(cors({ origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173'], credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

app.get('/api/debug/llm', async (_req, res) => {
  try {
    const pathMod = require('path');
    const { extractFromPdf } = await import('./services/aiService');
    const pdfPath = pathMod.join(__dirname, '..', 'sample-pdfs', 'sample-1-all-correct.pdf');
    const result = await extractFromPdf(pdfPath);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

app.get('/api/debug/pdf-text', async (_req, res) => {
  try {
    const fs = require('fs');
    const pathMod = require('path');
    const pdfParse = (await import('pdf-parse')).default;
    const pdfPath = pathMod.join(__dirname, '..', 'sample-pdfs', 'sample-1-all-correct.pdf');
    const buf = fs.readFileSync(pdfPath);
    const hex50 = Array.from(buf.slice(0, 50)).map((b: number) => b.toString(16).padStart(2, '0')).join(' ');
    const data = await pdfParse(buf);
    res.json({ text: data.text, numpages: data.numpages, pdfPath, size: buf.length, hex: hex50 });
  } catch (err: any) {
    const fs = require('fs');
    const pathMod = require('path');
    const pdfPath = pathMod.join(__dirname, '..', 'sample-pdfs', 'sample-1-all-correct.pdf');
    let info: any = {};
    try {
      const buf = fs.readFileSync(pdfPath);
      info = { size: buf.length, hex: Array.from(buf.slice(0, 50)).map((b: number) => b.toString(16).padStart(2, '0')).join(' '), path: pdfPath, dirname: __dirname };
    } catch (e2: any) {
      info = { fileError: e2.message, path: pdfPath, dirname: __dirname };
    }
    res.status(500).json({ error: err.message, info });
  }
});

app.use(errorHandler);

async function main() {
  await prisma.$connect();
  info('Connected to database');

  app.listen(PORT, () => {
    info(`Server running on http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  console.error('Failed to start server', err);
  process.exit(1);
});
