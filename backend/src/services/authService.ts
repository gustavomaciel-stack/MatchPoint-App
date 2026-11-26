import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AppError } from '../errors/AppError.js';
import { userRepository } from '../repositories/userRepository.js';

type LoginInput = {
  email?: unknown;
  password?: unknown;
};

export const authService = {
  login: async (data: LoginInput = {}) => {
    const { email, password } = data;

    if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
      throw new AppError('E-mail ou senha inválidos.', 401);
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await userRepository.findByEmail(normalizedEmail);
    const passwordMatches = user
      ? await bcrypt.compare(password, user.passwordHash)
      : false;

    if (!user || !passwordMatches) {
      throw new AppError('E-mail ou senha inválidos.', 401);
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      env.jwtSecret,
      { algorithm: 'HS256', expiresIn: '7d' },
    );

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  },
};
