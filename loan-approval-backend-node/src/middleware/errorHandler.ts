import { Request, Response, NextFunction } from 'express';
import { error as logError } from '../utils/logger';

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  logError(err.message || 'Unknown error');

  if (err.message === 'Only PDF files are allowed') {
    return res.status(400).json({ message: err.message });
  }

  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ message: 'File exceeds maximum size of 20MB' });
  }

  if (err.name === 'ZodError') {
    return res.status(400).json({ message: 'Validation error', errors: err.errors });
  }

  res.status(500).json({ message: 'Internal server error' });
}
