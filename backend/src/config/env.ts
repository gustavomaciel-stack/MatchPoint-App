import dotenv from 'dotenv';

dotenv.config();

const PLACEHOLDER = 'PREENCHA';

const configErrors: string[] = [];

const read = (name: string) => {
  const value = process.env[name]?.trim();
  return value && value !== PLACEHOLDER ? value : undefined;
};

const required = (name: string) => {
  const value = read(name);
  if (!value) configErrors.push(`${name} não definida.`);
  return value ?? '';
};

const jwtSecret = required('JWT_SECRET');
if (jwtSecret && jwtSecret.length < 32) {
  configErrors.push('JWT_SECRET deve ter pelo menos 32 caracteres.');
}

const databaseUrl = required('DATABASE_URL');

const adminEmail = read('ADMIN_EMAIL')?.toLowerCase();
const adminPassword = read('ADMIN_PASSWORD');
if (Boolean(adminEmail) !== Boolean(adminPassword)) {
  configErrors.push('Defina ADMIN_EMAIL e ADMIN_PASSWORD juntos, ou nenhum dos dois.');
}
if (adminPassword && adminPassword.length < 8) {
  configErrors.push('ADMIN_PASSWORD deve ter pelo menos 8 caracteres.');
}

if (configErrors.length) {
  throw new Error(`Configuração inválida:\n- ${configErrors.join('\n- ')}`);
}

export const env = {
  port: Number(process.env.PORT ?? 3001),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  databaseUrl,
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  jwtSecret,
  admin: adminEmail && adminPassword ? { email: adminEmail, password: adminPassword } : null,
};
