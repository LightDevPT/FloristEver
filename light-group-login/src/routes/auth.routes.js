import express from 'express';
import { z } from 'zod';
import { env } from '../config/env.js';
import { supabase, createPublicSupabaseClient } from '../config/supabase.js';
import { CURRENT_TERMS_VERSION } from '../config/terms.js';
import { authLimiter, loginLimiter } from '../middlewares/rateLimit.js';
import { requireAuth } from '../middlewares/auth.js';
import { asyncHandler, validate } from '../middlewares/validate.js';
import { AppError, created, ok } from '../utils/errors.js';
import { randomToken, sha256 } from '../utils/crypto.js';
import { validatePasswordPolicy } from '../utils/passwordPolicy.js';
import { clearAuthCookies, createAccessToken, createRefreshToken, setAuthCookies } from '../services/token.service.js';
import { getUserByEmail, getUserByIdentifier, getUserById, insertAudit, mapUser, unwrap, updateUser } from '../services/store.service.js';
import { sendPasswordResetEmail, sendSecurityEmail, sendVerificationEmail } from '../services/email.service.js';

export const authRouter = express.Router();

const reservedUsernames = new Set(['admin', 'root', 'support', 'suporte', 'lightgroup', 'floristever', 'api', 'system']);
const registerSchema = z.object({
  body: z.object({
    email: z.string().trim().email().max(254),
    username: z.string().trim().min(3).max(20).regex(/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/),
    password: z.string().min(1).max(128),
    confirmPassword: z.string().min(1).max(128),
    acceptTerms: z.literal(true),
    termsVersion: z.literal(CURRENT_TERMS_VERSION),
    marketingOptIn: z.boolean().optional().default(false)
  })
});
const loginSchema = z.object({
  body: z.object({
    identifier: z.string().trim().min(1).max(254),
    password: z.string().min(1).max(128),
    rememberMe: z.boolean().optional().default(false),
    deviceInfo: z.string().max(200).optional().default('')
  })
});
const tokenBodySchema = z.object({
  body: z.object({ refreshToken: z.string().optional(), deviceInfo: z.string().max(200).optional().default('') }).partial()
});
const forgotSchema = z.object({ body: z.object({ email: z.string().trim().email().max(254) }) });
const resetSchema = z.object({
  body: z.object({
    token: z.string().min(20),
    password: z.string().min(1).max(128),
    confirmPassword: z.string().min(1).max(128)
  })
});
const verifySchema = z.object({ query: z.object({ token: z.string().min(20) }) });

function normalEmail(email) {
  return email.trim().toLowerCase();
}

function getClientIp(req) {
  return req.ip || req.socket?.remoteAddress || '';
}

async function audit(req, event, userId = null, meta = null) {
  await insertAudit({
    userId,
    event,
    ip: getClientIp(req),
    userAgent: String(req.get('user-agent') || '').slice(0, 300),
    meta
  });
}

async function createEmailToken(user, type, ttlMs, extra = {}) {
  const token = randomToken(32);
  unwrap(await supabase.from('email_tokens').insert({
    user_id: user._id,
    type,
    token_hash: sha256(token),
    expires_at: new Date(Date.now() + ttlMs).toISOString(),
    ...extra
  }));
  return token;
}

function loginTokenFromReq(req) {
  return req.body?.refreshToken || req.cookies?.lg_refresh_token || null;
}

function authFailure(error, message) {
  if (error) throw new AppError(502, 'AUTH_PROVIDER_ERROR', message);
}

authRouter.post('/register', authLimiter, validate(registerSchema), asyncHandler(async (req, res) => {
  const body = req.validated.body;
  const email = normalEmail(body.email);
  const username = body.username.trim();
  const usernameLower = username.toLowerCase();

  if (reservedUsernames.has(usernameLower)) {
    throw new AppError(400, 'USERNAME_RESERVED', 'Este nome de utilizador está reservado.');
  }
  if (body.password !== body.confirmPassword) {
    throw new AppError(400, 'PASSWORD_MISMATCH', 'As palavras-passe não coincidem.');
  }

  const policy = await validatePasswordPolicy({ password: body.password, username, email });
  if (!policy.ok) {
    throw new AppError(400, 'PASSWORD_TOO_WEAK', 'A palavra-passe não cumpre os requisitos.', policy.failures);
  }

  const emailDuplicate = unwrap(await supabase.from('profiles').select('id').eq('email_lower', email).maybeSingle());
  const usernameDuplicate = emailDuplicate ? null
    : unwrap(await supabase.from('profiles').select('id').eq('username_lower', usernameLower).maybeSingle());
  const duplicate = emailDuplicate || usernameDuplicate;
  if (duplicate) {
    await audit(req, 'register_duplicate', duplicate.id);
    throw new AppError(409, 'USERNAME_OR_EMAIL_TAKEN', 'Este nome de utilizador ou email já está em uso.');
  }

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password: body.password,
    email_confirm: !env.REQUIRE_EMAIL_VERIFICATION,
    user_metadata: { username }
  });
  if (authError) {
    if (['email_exists', 'user_already_exists'].includes(authError.code)
      || /already registered|already been registered/i.test(authError.message || '')) {
      throw new AppError(409, 'USERNAME_OR_EMAIL_TAKEN', 'Este nome de utilizador ou email já está em uso.');
    }
    authFailure(authError, 'Não foi possível criar a conta no Supabase.');
  }

  const { data: profileRow, error: profileError } = await supabase.from('profiles').insert({
    id: authData.user.id,
    email,
    username,
    email_verified: !env.REQUIRE_EMAIL_VERIFICATION,
    terms_accepted_at: new Date().toISOString(),
    terms_version: body.termsVersion,
    marketing_opt_in: body.marketingOptIn
  }).select('*').single();

  if (profileError) {
    const { error: cleanupError } = await supabase.auth.admin.deleteUser(authData.user.id);
    if (cleanupError) {
      throw new Error(`Falha ao criar o perfil (${profileError.message}) e ao limpar o utilizador Supabase (${cleanupError.message}).`);
    }
    if (profileError.code === '23505') {
      throw new AppError(409, 'USERNAME_OR_EMAIL_TAKEN', 'Este nome de utilizador ou email já está em uso.');
    }
    throw profileError;
  }

  const user = mapUser(profileRow);
  await audit(req, 'register', user._id);
  if (email && !user.emailVerified) {
    const token = await createEmailToken(user, 'verify', 24 * 60 * 60 * 1000);
    await sendVerificationEmail(user, token);
  }
  created(res, {
    message: user.emailVerified ? 'Conta criada. Já podes iniciar sessão.' : 'Conta criada. Confirma o email antes de iniciares sessão.',
    user: user.toSafeJSON()
  });
}));

authRouter.post('/login', loginLimiter, validate(loginSchema), asyncHandler(async (req, res) => {
  const { identifier, password, rememberMe, deviceInfo } = req.validated.body;
  const user = await getUserByIdentifier(identifier.trim().toLowerCase());

  if (!user) {
    const publicClient = createPublicSupabaseClient();
    const { error } = await publicClient.auth.signInWithPassword({
      email: `unknown-${sha256(identifier.toLowerCase()).slice(0, 24)}@invalid.local`,
      password
    });
    if (error && ![400, 401, 422].includes(error.status)) {
      throw new AppError(502, 'AUTH_PROVIDER_ERROR', 'O serviço de autenticação Supabase está indisponível.');
    }
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Credenciais inválidas.');
  }
  if (user.lockUntil && new Date(user.lockUntil) > new Date()) {
    throw new AppError(423, 'ACCOUNT_LOCKED', 'Credenciais inválidas.');
  }

  const publicClient = createPublicSupabaseClient();
  const { error: signInError } = await publicClient.auth.signInWithPassword({ email: user.email, password });
  if (signInError) {
    if (signInError.code === 'email_not_confirmed' && !user.emailVerified) {
      throw new AppError(403, 'EMAIL_NOT_VERIFIED', 'Verifica o teu email antes de iniciar sessão.');
    }
    if (![400, 401, 422].includes(signInError.status)) {
      throw new AppError(502, 'AUTH_PROVIDER_ERROR', 'O serviço de autenticação Supabase está indisponível.');
    }
    const attempts = (user.failedLoginAttempts || 0) + 1;
    const lockUntil = attempts >= 5
      ? new Date(Date.now() + Math.min(24 * 60, 15 * (2 ** (attempts - 5))) * 60000).toISOString()
      : null;
    await updateUser(user._id, { failedLoginAttempts: attempts, ...(lockUntil ? { lockUntil } : {}) });
    if (lockUntil) {
      await sendSecurityEmail(user, 'Conta temporariamente bloqueada', 'A tua conta foi bloqueada temporariamente após várias tentativas falhadas.');
      await audit(req, 'lockout', user._id, { attempts });
    } else {
      await audit(req, 'login_fail', user._id, { attempts });
    }
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Credenciais inválidas.');
  }

  if (env.REQUIRE_EMAIL_VERIFICATION && !user.emailVerified) {
    throw new AppError(403, 'EMAIL_NOT_VERIFIED', 'Verifica o teu email antes de iniciar sessão.');
  }
  if (user.status !== 'active') {
    throw new AppError(403, 'ACCOUNT_DISABLED', 'Esta conta está desativada.');
  }

  const signedInUser = await updateUser(user._id, {
    failedLoginAttempts: 0,
    lockUntil: null,
    lastLoginAt: new Date().toISOString()
  });
  const accessToken = createAccessToken(signedInUser);
  const refresh = await createRefreshToken({
    userId: signedInUser._id,
    rememberMe,
    deviceInfo,
    ip: getClientIp(req)
  });
  setAuthCookies(res, { accessToken, refreshToken: refresh.token });
  await audit(req, 'login_success', signedInUser._id);
  ok(res, { user: signedInUser.toSafeJSON(), accessToken, refreshToken: refresh.token, expiresInSeconds: env.ACCESS_TOKEN_MINUTES * 60 });
}));

authRouter.post('/refresh', validate(tokenBodySchema), asyncHandler(async (req, res) => {
  const token = loginTokenFromReq(req);
  if (!token) throw new AppError(401, 'UNAUTHENTICATED', 'Tens de iniciar sessão.');
  const tokenHash = sha256(token);
  const current = unwrap(await supabase.from('refresh_tokens').select('*').eq('token_hash', tokenHash).maybeSingle());
  if (!current) throw new AppError(401, 'UNAUTHENTICATED', 'Tens de iniciar sessão.');

  const user = await getUserById(current.user_id);
  if (!user || user.status !== 'active') throw new AppError(401, 'UNAUTHENTICATED', 'Tens de iniciar sessão.');
  if (current.revoked_at) {
    unwrap(await supabase.from('refresh_tokens').update({ revoked_at: new Date().toISOString() })
      .eq('user_id', user._id).eq('family', current.family).is('revoked_at', null));
    await audit(req, 'token_reuse_detected', user._id);
    await sendSecurityEmail(user, 'Sessão terminada por segurança', 'Detetámos reutilização de uma sessão antiga e terminámos as sessões relacionadas.');
    throw new AppError(401, 'SESSION_REUSED', 'Sessão terminada por segurança.');
  }
  if (new Date(current.expires_at) <= new Date()) throw new AppError(401, 'SESSION_EXPIRED', 'A sessão expirou.');

  const refresh = await createRefreshToken({
    userId: user._id,
    rememberMe: true,
    deviceInfo: req.validated.body?.deviceInfo || current.device_info,
    ip: getClientIp(req),
    family: current.family
  });
  const rotated = unwrap(await supabase.from('refresh_tokens').update({
    revoked_at: new Date().toISOString(),
    replaced_by: refresh.record.id,
    last_used_at: new Date().toISOString()
  }).eq('id', current.id).is('revoked_at', null).select('id').maybeSingle());
  if (!rotated) {
    unwrap(await supabase.from('refresh_tokens').update({ revoked_at: new Date().toISOString() })
      .eq('user_id', user._id).eq('family', current.family).is('revoked_at', null));
    await audit(req, 'token_reuse_detected', user._id);
    throw new AppError(401, 'SESSION_REUSED', 'Sessão terminada por segurança.');
  }

  const accessToken = createAccessToken(user);
  setAuthCookies(res, { accessToken, refreshToken: refresh.token });
  ok(res, { accessToken, refreshToken: refresh.token, expiresInSeconds: env.ACCESS_TOKEN_MINUTES * 60 });
}));

authRouter.post('/logout', validate(tokenBodySchema), asyncHandler(async (req, res) => {
  const token = loginTokenFromReq(req);
  if (token) {
    unwrap(await supabase.from('refresh_tokens').update({ revoked_at: new Date().toISOString() })
      .eq('token_hash', sha256(token)).is('revoked_at', null));
  }
  clearAuthCookies(res);
  ok(res, { message: 'Sessão terminada.' });
}));

authRouter.post('/logout-all', requireAuth, asyncHandler(async (req, res) => {
  unwrap(await supabase.from('refresh_tokens').update({ revoked_at: new Date().toISOString() })
    .eq('user_id', req.user._id).is('revoked_at', null));
  clearAuthCookies(res);
  await audit(req, 'logout_all', req.user._id);
  ok(res, { message: 'Todas as sessões foram terminadas.' });
}));

authRouter.get('/verify-email', validate(verifySchema), asyncHandler(async (req, res) => {
  const record = unwrap(await supabase.from('email_tokens').select('*')
    .eq('token_hash', sha256(req.validated.query.token)).in('type', ['verify', 'change-email']).is('used_at', null).maybeSingle());
  if (!record || new Date(record.expires_at) <= new Date()) throw new AppError(400, 'TOKEN_INVALID', 'Token inválido ou expirado.');
  const user = await getUserById(record.user_id);
  if (!user) throw new AppError(400, 'TOKEN_INVALID', 'Token inválido ou expirado.');

  if (record.type === 'change-email') {
    const duplicate = await getUserByEmail(record.new_email);
    if (duplicate && duplicate._id !== user._id) throw new AppError(409, 'EMAIL_TAKEN', 'Este email já está em uso.');
    const { error } = await supabase.auth.admin.updateUserById(user._id, { email: record.new_email, email_confirm: true });
    authFailure(error, 'Não foi possível atualizar o email no Supabase.');
    await updateUser(user._id, { email: record.new_email, emailVerified: true });
  } else {
    const { error } = await supabase.auth.admin.updateUserById(user._id, { email_confirm: true });
    authFailure(error, 'Não foi possível verificar o email no Supabase.');
    await updateUser(user._id, { emailVerified: true });
  }

  unwrap(await supabase.from('email_tokens').update({ used_at: new Date().toISOString() }).eq('id', record.id));
  await audit(req, record.type === 'change-email' ? 'email_change' : 'email_verified', user._id);
  ok(res, { message: 'Email verificado. Já podes iniciar sessão.' });
}));

authRouter.post('/resend-verification', authLimiter, validate(forgotSchema), asyncHandler(async (req, res) => {
  const user = await getUserByEmail(normalEmail(req.validated.body.email));
  if (user && !user.emailVerified) {
    const token = await createEmailToken(user, 'verify', 24 * 60 * 60 * 1000);
    await sendVerificationEmail(user, token);
  }
  ok(res, { message: 'Se a conta existir, enviamos instruções.' });
}));

authRouter.post('/forgot-password', authLimiter, validate(forgotSchema), asyncHandler(async (req, res) => {
  const user = await getUserByEmail(normalEmail(req.validated.body.email));
  if (user) {
    const token = await createEmailToken(user, 'reset', 60 * 60 * 1000);
    await sendPasswordResetEmail(user, token);
  }
  ok(res, { message: 'Se o email existir, enviamos instruções.' });
}));

authRouter.post('/reset-password', authLimiter, validate(resetSchema), asyncHandler(async (req, res) => {
  const { token, password, confirmPassword } = req.validated.body;
  if (password !== confirmPassword) throw new AppError(400, 'PASSWORD_MISMATCH', 'As palavras-passe não coincidem.');
  const record = unwrap(await supabase.from('email_tokens').select('*')
    .eq('token_hash', sha256(token)).eq('type', 'reset').is('used_at', null).maybeSingle());
  if (!record || new Date(record.expires_at) <= new Date()) throw new AppError(400, 'TOKEN_INVALID', 'Token inválido ou expirado.');
  const user = await getUserById(record.user_id);
  if (!user) throw new AppError(400, 'TOKEN_INVALID', 'Token inválido ou expirado.');
  const policy = await validatePasswordPolicy({ password, username: user.username, email: user.email });
  if (!policy.ok) throw new AppError(400, 'PASSWORD_TOO_WEAK', 'A palavra-passe não cumpre os requisitos.', policy.failures);

  const { error } = await supabase.auth.admin.updateUserById(user._id, {
    password,
    email_confirm: true
  });
  authFailure(error, 'Não foi possível atualizar a palavra-passe no Supabase.');
  unwrap(await supabase.from('email_tokens').update({ used_at: new Date().toISOString() }).eq('id', record.id));
  unwrap(await supabase.from('refresh_tokens').update({ revoked_at: new Date().toISOString() })
    .eq('user_id', user._id).is('revoked_at', null));
  await updateUser(user._id, { failedLoginAttempts: 0, lockUntil: null, emailVerified: true });
  await audit(req, 'password_reset', user._id);
  await sendSecurityEmail(user, 'Palavra-passe alterada', 'A tua palavra-passe foi alterada com sucesso.');
  ok(res, { message: 'Palavra-passe alterada.' });
}));
