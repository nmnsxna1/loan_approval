import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import authRoutes from './routes/auth';
import applicationRoutes from './routes/applications';
import uploadRoutes from './routes/upload';
import { errorHandler } from './middleware/errorHandler';
import { authenticate } from './middleware/auth';
import { apiLogger, perfLogger } from './utils/logger';

const app = express();

// CORS origins from env var or default to localhost dev origins
const corsOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(s => s.trim())
  : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173'];
app.use(cors({ origin: corsOrigins, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use((req, _res, next) => {
  (req as any).requestId = uuidv4();
  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  const { method, originalUrl } = req;
  res.on('finish', () => {
    const duration = Date.now() - start;
    apiLogger.info(`${method} ${originalUrl} -> ${res.statusCode}`, {
      requestId: (req as any).requestId,
      url: originalUrl,
      userId: (req as any).user?.id,
      file: 'src/index.ts',
      function: 'apiMiddleware',
    });
    perfLogger?.info(`API ${method} ${originalUrl} took ${duration}ms`, {
      requestId: (req as any).requestId,
      file: 'src/index.ts',
    });
  });
  next();
});

app.use('/api/auth', authRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/uploads', authenticate, express.static(path.join(__dirname, '..', 'uploads')));

app.get('/api/health', (req, res) => {
  apiLogger.info('Health check', { requestId: (req as any).requestId, url: '/api/health', file: 'src/index.ts' });
  res.json({ status: 'ok' });
});

if (process.env.NODE_ENV !== 'production') {
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
      const hex50 = buf.subarray(0, 50).toString('hex').match(/.{2}/g)?.join(' ') || '';
      const data = await pdfParse(buf);
      res.json({ text: data.text, numpages: data.numpages, pdfPath, size: buf.length, hex: hex50 });
    } catch (err: any) {
      const fs = require('fs');
      const pathMod = require('path');
      const pdfPath = pathMod.join(__dirname, '..', 'sample-pdfs', 'sample-1-all-correct.pdf');
      let info: any = {};
      try {
        const buf = fs.readFileSync(pdfPath);
        info = { size: buf.length, hex: buf.subarray(0, 50).toString('hex').match(/.{2}/g)?.join(' ') || '', path: pdfPath, dirname: __dirname };
      } catch (e2: any) {
        info = { fileError: e2.message, path: pdfPath, dirname: __dirname };
      }
      res.status(500).json({ error: err.message, info });
    }
  });
}

app.use(errorHandler);

export default app;
