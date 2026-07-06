import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { generateToken } from '../utils/jwt';
import { authLogger, apiLogger } from '../utils/logger';
import { z } from 'zod';

const prisma = new PrismaClient();

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

export async function login(req: Request, res: Response) {
  const { username, password } = loginSchema.parse(req.body);

  authLogger.info(`Login attempt for user: ${username}`, {
    file: 'src/controllers/authController.ts',
    function: 'login',
    url: '/api/auth/login',
    requestId: (req as any).requestId,
  });

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) {
    authLogger.warn(`Login failed - user not found: ${username}`, {
      file: 'src/controllers/authController.ts',
      function: 'login',
      requestId: (req as any).requestId,
    });
    return res.status(401).json({ message: 'Invalid username or password' });
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    authLogger.warn(`Login failed - invalid password for: ${username}`, {
      file: 'src/controllers/authController.ts',
      function: 'login',
      requestId: (req as any).requestId,
    });
    return res.status(401).json({ message: 'Invalid username or password' });
  }

  const token = generateToken({ id: user.id, username: user.username, role: user.role });

  authLogger.info(`Login successful: ${username} (${user.role})`, {
    file: 'src/controllers/authController.ts',
    function: 'login',
    userId: user.id,
    requestId: (req as any).requestId,
  });

  res.json({
    token,
    username: user.username,
    email: user.email,
    role: user.role,
  });
}
