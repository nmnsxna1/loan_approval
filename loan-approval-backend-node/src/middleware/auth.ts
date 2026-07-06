import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { authLogger } from '../utils/logger';

export interface AuthRequest extends Request {
  user?: { id: string; username: string; role: string };
  params: Record<string, string>;
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    authLogger.warn('Authentication required - no token', {
      file: 'src/middleware/auth.ts',
      function: 'authenticate',
      url: req.originalUrl,
    });
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    const token = authHeader.split(' ')[1];
    req.user = verifyToken(token);
    authLogger.info(`User authenticated: ${req.user.username} (${req.user.role})`, {
      file: 'src/middleware/auth.ts',
      function: 'authenticate',
      requestId: (req as any).requestId,
      userId: req.user.id,
    });
    next();
  } catch {
    authLogger.warn('Invalid or expired token', {
      file: 'src/middleware/auth.ts',
      function: 'authenticate',
      url: req.originalUrl,
      requestId: (req as any).requestId,
    });
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

export function authorize(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      authLogger.warn('Authorization failed - not authenticated', {
        file: 'src/middleware/auth.ts',
        function: 'authorize',
        url: req.originalUrl,
      });
      return res.status(401).json({ message: 'Authentication required' });
    }
    if (!roles.includes(req.user.role)) {
      authLogger.warn(`Authorization denied - ${req.user.role} not in [${roles.join(',')}]`, {
        file: 'src/middleware/auth.ts',
        function: 'authorize',
        url: req.originalUrl,
        userId: req.user.id,
        requestId: (req as any).requestId,
      });
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
    next();
  };
}
