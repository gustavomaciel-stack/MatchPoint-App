import { prisma } from '../config/prisma.js';

export const userRepository = {
  findByEmail: (email: string) => {
    return prisma.user.findUnique({ where: { email } });
  },

  findById: (id: string) => {
    return prisma.user.findUnique({ where: { id } });
  },

  findAuthInfo: (id: string) => {
    return prisma.user.findUnique({ where: { id }, select: { id: true, role: true } });
  },

  create: (data: {
    name: string;
    email: string;
    passwordHash: string;
    role?: 'USER' | 'ADMIN';
  }) => {
    return prisma.user.create({ data });
  },

  updateRole: (id: string, role: 'USER' | 'ADMIN') => {
    return prisma.user.update({ where: { id }, data: { role } });
  },

  updatePassword: (id: string, passwordHash: string) => {
    return prisma.user.update({ where: { id }, data: { passwordHash } });
  },

  remove: (id: string) => {
    return prisma.user.delete({ where: { id } });
  },

  findAll: () => {
    return prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
    });
  },
};
