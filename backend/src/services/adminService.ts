import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';
import { userRepository } from '../repositories/userRepository.js';

export const adminService = {
  ensureDefaultAdmin: async () => {
    if (!env.admin) {
      console.warn('ADMIN_EMAIL/ADMIN_PASSWORD não definidas: nenhum administrador padrão será criado.');
      return null;
    }

    const existingAdmin = await userRepository.findByEmail(env.admin.email);

    if (existingAdmin) {
      if (existingAdmin.role !== 'ADMIN') {
        await userRepository.updateRole(existingAdmin.id, 'ADMIN');
      }
      if (!(await bcrypt.compare(env.admin.password, existingAdmin.passwordHash))) {
        await userRepository.updatePassword(existingAdmin.id, await bcrypt.hash(env.admin.password, 10));
      }
      return existingAdmin;
    }

    const passwordHash = await bcrypt.hash(env.admin.password, 10);

    return userRepository.create({
      name: 'Administrador',
      email: env.admin.email,
      passwordHash,
      role: 'ADMIN',
    });
  },
};
