import { Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/auth';
import { generateToken } from '../utils/jwt';
import { authLogger, apiLogger } from '../utils/logger';
import { z } from 'zod';

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

export async function login(req: AuthRequest, res: Response) {
  const { username, password } = loginSchema.parse(req.body);

  authLogger.info(`Login attempt for user: ${username}`, {
    file: 'src/controllers/authController.ts',
    function: 'login',
    url: '/api/auth/login',
    requestId: req.requestId,
  });

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) {
    authLogger.warn(`Login failed - user not found: ${username}`, {
      file: 'src/controllers/authController.ts',
      function: 'login',
      requestId: req.requestId,
    });
    return res.status(401).json({ message: 'Invalid username or password' });
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    authLogger.warn(`Login failed - invalid password for: ${username}`, {
      file: 'src/controllers/authController.ts',
      function: 'login',
      requestId: req.requestId,
    });
    return res.status(401).json({ message: 'Invalid username or password' });
  }

  const token = generateToken({ id: user.id, username: user.username, role: user.role });

  authLogger.info(`Login successful: ${username} (${user.role})`, {
    file: 'src/controllers/authController.ts',
    function: 'login',
    userId: user.id,
    requestId: req.requestId,
  });

  res.json({
    token,
    username: user.username,
    email: user.email,
    role: user.role,
  });
}
