import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../errors/AppError.js';

const isBodyParserError = (err: unknown): err is { type: string; status?: number } =>
  typeof err === 'object' && err !== null && typeof (err as { type?: unknown }).type === 'string';

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ message: err.message });
  }

  if (isBodyParserError(err)) {
    if (err.type === 'entity.parse.failed') {
      return res.status(400).json({ message: 'O corpo da requisição não é um JSON válido.' });
    }
    if (err.type === 'entity.too.large') {
      return res.status(413).json({ message: 'O corpo da requisição é grande demais.' });
    }
  }

  console.error(err.stack ?? err.message);
  res.status(500).json({
    message: 'Internal Server Error',
  });
};
