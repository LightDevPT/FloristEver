import { verifyAccessToken } from '../services/token.service.js';
import { AppError } from '../utils/errors.js';
import { getUserById } from '../services/store.service.js';

function getBearer(req) {
  const header = req.get('authorization') || '';
  return header.startsWith('Bearer ') ? header.slice(7) : null;
}

export async function requireAuth(req, _res, next) {
  const token = getBearer(req) || req.cookies?.lg_access_token;
  if (!token) {
    next(new AppError(401, 'UNAUTHENTICATED', 'Tens de iniciar sessão.'));
    return;
  }

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    next(new AppError(401, 'UNAUTHENTICATED', 'Tens de iniciar sessão.'));
    return;
  }
  if (typeof payload.sub !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(payload.sub)) {
    next(new AppError(401, 'UNAUTHENTICATED', 'Tens de iniciar sessão.'));
    return;
  }

  try {
    const user = await getUserById(payload.sub);
    if (!user || user.status !== 'active') throw new AppError(401, 'UNAUTHENTICATED', 'Tens de iniciar sessão.');
    req.user = user;
    req.accessTokenPayload = payload;
    next();
  } catch (error) {
    next(error);
  }
}
