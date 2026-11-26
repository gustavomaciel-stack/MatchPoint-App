import express from 'express';
import type { Server } from 'node:http';
import { env } from './config/env.js';
import { prisma } from './config/prisma.js';
import routes from './routes/index.js';
import { corsMiddleware } from './middlewares/cors.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { notFound } from './middlewares/notFound.js';
import { adminService } from './services/adminService.js';

const app = express();
let server: Server | undefined;

const startServer = async () => {
  await adminService.ensureDefaultAdmin();

  app.disable('x-powered-by');
  app.use(corsMiddleware);
  app.use(express.json({ limit: '100kb' }));
  app.use(routes);

  app.use(notFound);
  app.use(errorHandler);

  server = app.listen(env.port, () => {
    console.log(`MatchPoint backend running on port ${env.port}`);
  });
};

startServer().catch(async (error: unknown) => {
  console.error('Falha ao iniciar o backend:', error);
  await prisma.$disconnect();
  process.exit(1);
});

const shutdown = () => {
  server?.close();
  void prisma.$disconnect().finally(() => process.exit(0));
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
