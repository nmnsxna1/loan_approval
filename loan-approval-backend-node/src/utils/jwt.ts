import jwt from 'jsonwebtoken';
import { authLogger } from './logger';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

export function generateToken(payload: { id: string; username: string; role: string }): string {
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN as any });
  authLogger.info(`Token generated for ${payload.username} (${payload.role})`, {
    file: 'src/utils/jwt.ts',
    function: 'generateToken',
    userId: payload.id,
  });
  return token;
}

export function verifyToken(token: string): { id: string; username: string; role: string } {
  const decoded = jwt.verify(token, JWT_SECRET) as { id: string; username: string; role: string };
  authLogger.info(`Token verified for ${decoded.username} (${decoded.role})`, {
    file: 'src/utils/jwt.ts',
    function: 'verifyToken',
    userId: decoded.id,
  });
  return decoded;
}
