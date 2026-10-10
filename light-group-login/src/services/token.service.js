import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { randomToken, sha256 } from '../utils/crypto.js';
import { supabase } from '../config/supabase.js';
import { unwrap } from './store.service.js';

export function createAccessToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), roles: user.roles || ['user'] },
    env.JWT_ACCESS_SECRET,
    {
      algorithm: 'HS256',
      expiresIn: `${env.ACCESS_TOKEN_MINUTES}m`,
      jwtid: crypto.randomUUID()
    }
  );
}

export function verifyAccessToken(token) {
  return jwt.verify(token, env.JWT_ACCESS_SECRET, { algorithms: ['HS256'] });
}

export async function createRefreshToken({ userId, rememberMe, deviceInfo, ip, family = crypto.randomUUID() }) {
  const token = randomToken(32);
  const expiresAt = new Date(Date.now() + (rememberMe ? env.REFRESH_TOKEN_REMEMBER_DAYS : env.REFRESH_TOKEN_DAYS) * 86400000);
  const record = unwrap(await supabase.from('refresh_tokens').insert({
    user_id: userId,
    token_hash: sha256(token),
    family,
    device_info: String(deviceInfo || '').slice(0, 200),
    ip: String(ip || '').slice(0, 80),
    expires_at: expiresAt.toISOString()
  }).select('*').single());
  return { token, record };
}

export function setAuthCookies(res, { accessToken, refreshToken }) {
  const sameSite = env.COOKIE_SAME_SITE;
  const secure = env.COOKIE_SECURE || env.NODE_ENV === 'production';
  res.cookie('lg_access_token', accessToken, {
    httpOnly: true,
    secure,
    sameSite,
    maxAge: env.ACCESS_TOKEN_MINUTES * 60 * 1000,
    path: '/'
  });
  res.cookie('lg_refresh_token', refreshToken, {
    httpOnly: true,
    secure,
    sameSite,
    maxAge: env.REFRESH_TOKEN_REMEMBER_DAYS * 86400000,
    path: '/api/v1/auth/refresh'
  });
}

export function clearAuthCookies(res) {
  res.clearCookie('lg_access_token', { path: '/' });
  res.clearCookie('lg_refresh_token', { path: '/api/v1/auth/refresh' });
}
