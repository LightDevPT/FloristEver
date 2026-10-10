import { AppError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

export function notFound(_req, _res, next) {
  next(new AppError(404, 'NOT_FOUND', 'Rota não encontrada.'));
}

export function errorHandler(error, _req, res, _next) {
  const status = error.status || 500;
  const code = error.code || 'INTERNAL_ERROR';
  if (status >= 500) logger.error({ err: error }, 'Erro interno.');
  res.status(status).json({
    ok: false,
    error: {
      code,
      message: status >= 500 ? 'Ocorreu um erro inesperado.' : error.message,
      details: error.details,
      ...(env.NODE_ENV !== 'production' && status >= 500 ? { stack: error.stack } : {})
    }
  });
}
