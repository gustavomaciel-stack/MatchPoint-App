import bcrypt from 'bcryptjs';
import { userRepository } from '../repositories/userRepository.js';
import { AppError } from '../errors/AppError.js';

const SALT_ROUNDS = 10;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const userService = {
  register: async (data: { name?: unknown; email?: unknown; password?: unknown } = {}) => {
    const { name, email, password } = data;

    if (
      typeof name !== 'string' || typeof email !== 'string' || typeof password !== 'string'
      || !name.trim() || !email.trim() || !password
    ) {
      throw new AppError('Nome, e-mail e senha são obrigatórios.', 400);
    }

    if (name.trim().length > 100) {
      throw new AppError('O nome deve ter até 100 caracteres.', 400);
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (normalizedEmail.length > 254 || !EMAIL_PATTERN.test(normalizedEmail)) {
      throw new AppError('Informe um e-mail válido.', 400);
    }

    if (password.length < 6 || password.length > 72) {
      throw new AppError('A senha deve ter entre 6 e 72 caracteres.', 400);
    }

    const existing = await userRepository.findByEmail(normalizedEmail);
    if (existing) {
      throw new AppError('Já existe um usuário com este e-mail.', 409);
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await userRepository.create({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      role: 'USER',
    });

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    };
  },

  list: async () => {
    const users = await userRepository.findAll();
    return users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      createdAt: u.createdAt,
    }));
  },

  getById: async (id: string) => {
    const user = await userRepository.findById(id);
    if (!user) {
      throw new AppError('Usuário não encontrado.', 404);
    }
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    };
  },

  remove: async (id: string, actorRole: 'USER' | 'ADMIN') => {
    if (actorRole !== 'ADMIN') {
      throw new AppError('Acesso negado.', 403);
    }

    const user = await userRepository.findById(id);
    if (!user) {
      throw new AppError('Usuário não encontrado.', 404);
    }

    if (user.role === 'ADMIN') {
      throw new AppError('Não é possível remover uma conta de administrador.', 400);
    }

    await userRepository.remove(id);
    return { deleted: true };
  },
};
