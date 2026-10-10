import express from 'express';
import { z } from 'zod';
import { env } from '../config/env.js';
import { supabase, createPublicSupabaseClient } from '../config/supabase.js';
import { requireAuth } from '../middlewares/auth.js';
import { asyncHandler, validate } from '../middlewares/validate.js';
import { AppError, ok } from '../utils/errors.js';
import { randomToken, sha256 } from '../utils/crypto.js';
import { validatePasswordPolicy } from '../utils/passwordPolicy.js';
import { sendSecurityEmail } from '../services/email.service.js';
import { getUserByEmail, insertAudit, unwrap, updateUser } from '../services/store.service.js';

export const userRouter = express.Router();
userRouter.use(requireAuth);

const usernameSchema = z.object({
  body: z.object({ username: z.string().trim().min(3).max(20).regex(/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/) })
});
const passwordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1).max(128),
    password: z.string().min(1).max(128),
    confirmPassword: z.string().min(1).max(128)
  })
});
const emailSchema = z.object({
  body: z.object({ password: z.string().min(1).max(128), newEmail: z.string().trim().email().max(254) })
});
const deleteSchema = z.object({ body: z.object({ password: z.string().min(1).max(128) }) });
const sessionIdSchema = z.object({ params: z.object({ id: z.string().uuid() }) });

async function verifyPassword(user, password) {
  const client = createPublicSupabaseClient();
  const { error } = await client.auth.signInWithPassword({ email: user.email, password });
  if (error && ![400, 401, 422].includes(error.status)) {
    throw new AppError(502, 'AUTH_PROVIDER_ERROR', 'O serviço de autenticação Supabase está indisponível.');
  }
  return !error;
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

function getClientIp(req) {
  return req.ip || req.socket?.remoteAddress || '';
}

function camelizeSave(row) {
  return {
    _id: row.id,
    userId: row.user_id,
    appId: row.app_id,
    saveVersion: row.save_version,
    revision: row.revision,
    deviceId: row.device_id,
    data: row.data,
    checksum: row.checksum,
    updatedAt: row.updated_at,
    createdAt: row.created_at
  };
}

userRouter.get('/me', asyncHandler(async (req, res) => {
  ok(res, { user: req.user.toSafeJSON() });
}));

userRouter.patch('/me', validate(usernameSchema), asyncHandler(async (req, res) => {
  const username = req.validated.body.username;
  const duplicate = unwrap(await supabase.from('profiles').select('id').eq('username_lower', username.toLowerCase()).neq('id', req.user._id).maybeSingle());
  if (duplicate) throw new AppError(409, 'USERNAME_TAKEN', 'Este nome de utilizador já está em uso.');
  let user;
  try {
    user = await updateUser(req.user._id, { username });
  } catch (error) {
    if (error.code === '23505') throw new AppError(409, 'USERNAME_TAKEN', 'Este nome de utilizador já está em uso.');
    throw error;
  }
  ok(res, { user: user.toSafeJSON() });
}));

userRouter.post('/me/change-password', validate(passwordSchema), asyncHandler(async (req, res) => {
  const { currentPassword, password, confirmPassword } = req.validated.body;
  if (password !== confirmPassword) throw new AppError(400, 'PASSWORD_MISMATCH', 'As palavras-passe não coincidem.');
  if (!await verifyPassword(req.user, currentPassword)) throw new AppError(401, 'INVALID_CREDENTIALS', 'Credenciais inválidas.');
  const policy = await validatePasswordPolicy({ password, username: req.user.username, email: req.user.email });
  if (!policy.ok) throw new AppError(400, 'PASSWORD_TOO_WEAK', 'A palavra-passe não cumpre os requisitos.', policy.failures);
  const { error } = await supabase.auth.admin.updateUserById(req.user._id, { password });
  if (error) throw new AppError(502, 'AUTH_PROVIDER_ERROR', 'Não foi possível atualizar a palavra-passe no Supabase.');
  await Promise.all([
    supabase.from('refresh_tokens').update({ revoked_at: new Date().toISOString() }).eq('user_id', req.user._id).is('revoked_at', null),
    insertAudit({ userId: req.user._id, event: 'password_change', ip: req.ip, userAgent: req.get('user-agent') || '' })
  ]).then(([tokenResult]) => {
    if (tokenResult.error) throw tokenResult.error;
  });
  ok(res, { message: 'Palavra-passe alterada.' });
}));

userRouter.post('/me/change-email', validate(emailSchema), asyncHandler(async (req, res) => {
  if (!await verifyPassword(req.user, req.validated.body.password)) throw new AppError(401, 'INVALID_CREDENTIALS', 'Credenciais inválidas.');
  const newEmail = req.validated.body.newEmail.trim().toLowerCase();
  const duplicate = await getUserByEmail(newEmail);
  if (duplicate && duplicate._id !== req.user._id) throw new AppError(409, 'EMAIL_TAKEN', 'Este email já está em uso.');
  const token = await createEmailToken(req.user, 'change-email', 24 * 60 * 60 * 1000, { new_email: newEmail });
  const link = `${env.PUBLIC_BASE_URL}/api/v1/auth/verify-email?token=${encodeURIComponent(token)}`;
  await sendSecurityEmail({ email: newEmail }, 'Confirma o novo email', `Abre este link para confirmar o novo email: ${link}`);
  await sendSecurityEmail(req.user, 'Alteração de email pedida', `Foi pedido para alterar o email da tua conta para ${newEmail}.`);
  ok(res, { message: 'Pedido de alteração registado. Confirmação por email pendente.' });
}));

userRouter.get('/me/sessions', asyncHandler(async (req, res) => {
  const rows = unwrap(await supabase.from('refresh_tokens').select('id,device_info,ip,created_at,last_used_at,expires_at')
    .eq('user_id', req.user._id).is('revoked_at', null).gt('expires_at', new Date().toISOString()).order('created_at', { ascending: false }));
  ok(res, { sessions: rows.map((row) => ({
    _id: row.id,
    deviceInfo: row.device_info,
    ip: row.ip,
    createdAt: row.created_at,
    lastUsedAt: row.last_used_at,
    expiresAt: row.expires_at
  })) });
}));

userRouter.delete('/me/sessions/:id', validate(sessionIdSchema), asyncHandler(async (req, res) => {
  unwrap(await supabase.from('refresh_tokens').update({ revoked_at: new Date().toISOString() })
    .eq('id', req.validated.params.id).eq('user_id', req.user._id));
  ok(res, { message: 'Sessão revogada.' });
}));

userRouter.get('/me/export', asyncHandler(async (req, res) => {
  const [saveRows, backupRows] = await Promise.all([
    supabase.from('saves').select('*').eq('user_id', req.user._id),
    supabase.from('save_backups').select('*').eq('user_id', req.user._id)
  ]);
  const saves = unwrap(saveRows).map(camelizeSave);
  const backups = unwrap(backupRows).map((row) => ({
    _id: row.id,
    userId: row.user_id,
    appId: row.app_id,
    saveVersion: row.save_version,
    revision: row.revision,
    deviceId: row.device_id,
    data: row.data,
    checksum: row.checksum,
    originalUpdatedAt: row.original_updated_at,
    createdAt: row.created_at
  }));
  ok(res, { user: req.user.toSafeJSON(), saves, backups });
}));

userRouter.delete('/me', validate(deleteSchema), asyncHandler(async (req, res) => {
  if (!await verifyPassword(req.user, req.validated.body.password)) throw new AppError(401, 'INVALID_CREDENTIALS', 'Credenciais inválidas.');
  await insertAudit({ userId: req.user._id, event: 'account_deleted', ip: getClientIp(req) });
  const { error } = await supabase.auth.admin.deleteUser(req.user._id);
  if (error) throw new AppError(502, 'AUTH_PROVIDER_ERROR', 'Não foi possível apagar a conta no Supabase.');
  ok(res, { message: 'Conta apagada.' });
}));
