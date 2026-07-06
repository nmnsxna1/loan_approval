import jwt from 'jsonwebtoken';
import { authLogger } from './logger';

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set');
  }
  return secret;
}

export function generateToken(payload: { id: string; username: string; role: string }): string {
  const secret = getJwtSecret();
  const token = jwt.sign(payload, secret, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions);
  authLogger.info(`Token generated for ${payload.username} (${payload.role})`, {
    file: 'src/utils/jwt.ts',
    function: 'generateToken',
    userId: payload.id,
  });
  return token;
}

export function verifyToken(token: string): { id: string; username: string; role: string } {
  const secret = getJwtSecret();
  const decoded = jwt.verify(token, secret) as { id: string; username: string; role: string };
  authLogger.info(`Token verified for ${decoded.username} (${decoded.role})`, {
    file: 'src/utils/jwt.ts',
    function: 'verifyToken',
    userId: decoded.id,
  });
  return decoded;
}
