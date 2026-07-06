import { Request, Response, NextFunction } from 'express';
import { errorLogger, apiLogger } from '../utils/logger';

export function errorHandler(err: any, req: Request, res: Response, _next: NextFunction) {
  errorLogger.error(err.message || 'Unknown error', {
    file: 'src/middleware/errorHandler.ts',
    function: 'errorHandler',
    stack: err.stack,
    url: req.originalUrl,
    requestId: (req as any).requestId,
    userId: (req as any).user?.id,
  });

  if (err.message === 'Only PDF files are allowed') {
    return res.status(400).json({ message: err.message });
  }

  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ message: 'File exceeds maximum size of 20MB' });
  }

  if (err.name === 'ZodError') {
    apiLogger.warn('Validation error', {
      file: 'src/middleware/errorHandler.ts',
      url: req.originalUrl,
      errors: err.errors,
    });
    return res.status(400).json({ message: 'Validation error', errors: err.errors });
  }

  res.status(500).json({ message: 'Internal server error' });
}
