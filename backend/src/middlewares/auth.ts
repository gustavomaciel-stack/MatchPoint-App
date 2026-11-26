import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { userRepository } from '../repositories/userRepository.js';

const unauthorized = (res: Response) => {
  return res.status(401).json({ message: 'Não autenticado.' });
};

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const authorization = req.get('Authorization');
  const match = authorization?.match(/^Bearer\s+(\S+)$/i);

  if (!match) {
    return unauthorized(res);
  }

  let userId: string;
  try {
    const payload = jwt.verify(match[1], env.jwtSecret, { algorithms: ['HS256'] });

    if (typeof payload === 'string' || typeof payload.userId !== 'string' || !payload.userId) {
      return unauthorized(res);
    }

    userId = payload.userId;
  } catch {
    return unauthorized(res);
  }

  try {
    const user = await userRepository.findAuthInfo(userId);
    if (!user) {
      return unauthorized(res);
    }

    req.user = { userId: user.id, role: user.role };
    return next();
  } catch (error) {
    return next(error);
  }
};
