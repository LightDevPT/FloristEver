import { env } from '../config/env.js';
import { AppError } from '../utils/errors.js';

export function csrfGuard(req, _res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const hasCookieAuth = Boolean(req.cookies?.lg_access_token || req.cookies?.lg_refresh_token);
  const hasBearer = (req.get('authorization') || '').startsWith('Bearer ');
  if (!hasCookieAuth || hasBearer) return next();

  const origin = req.get('origin');
  const referer = req.get('referer');
  const originOk = origin ? env.allowedOrigins.includes(origin) : true;
  const refererOk = referer ? env.allowedOrigins.some((allowed) => referer.startsWith(allowed)) : true;
  const csrfCookie = req.cookies?.lg_csrf;
  const csrfHeader = req.get('x-csrf-token');
  if (!originOk || !refererOk || !csrfCookie || csrfCookie !== csrfHeader) {
    next(new AppError(403, 'CSRF_FAILED', 'Pedido recusado por segurança.'));
    return;
  }
  next();
}
