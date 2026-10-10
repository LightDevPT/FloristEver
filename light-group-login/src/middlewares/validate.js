import { AppError } from '../utils/errors.js';

function hasOperator(value) {
  if (!value || typeof value !== 'object') return false;
  if (Array.isArray(value)) return value.some(hasOperator);
  return Object.keys(value).some((key) => key.startsWith('$') || key.includes('.')) ||
    Object.values(value).some(hasOperator);
}

export function validate(schema) {
  return (req, _res, next) => {
    if (hasOperator(req.body) || hasOperator(req.query) || hasOperator(req.params)) {
      next(new AppError(400, 'INVALID_INPUT', 'Pedido inválido.'));
      return;
    }
    const result = schema.safeParse({
      body: req.body,
      params: req.params,
      query: req.query
    });
    if (!result.success) {
      next(new AppError(400, 'VALIDATION_ERROR', 'Verifica os dados enviados.', result.error.flatten()));
      return;
    }
    req.validated = result.data;
    next();
  };
}

export function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}
