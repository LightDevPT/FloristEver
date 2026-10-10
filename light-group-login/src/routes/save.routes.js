import express from 'express';
import { z } from 'zod';
import { env } from '../config/env.js';
import { supabase } from '../config/supabase.js';
import { requireAuth } from '../middlewares/auth.js';
import { saveLimiter } from '../middlewares/rateLimit.js';
import { asyncHandler, validate } from '../middlewares/validate.js';
import { AppError, ok } from '../utils/errors.js';
import { checksumJson, stableJson } from '../utils/crypto.js';
import { unwrap } from '../services/store.service.js';

export const saveRouter = express.Router();
saveRouter.use(requireAuth);

const paramsSchema = z.object({ params: z.object({ appId: z.string().min(2).max(40).regex(/^[a-z0-9._-]+$/) }) });
const backupParamsSchema = z.object({
  params: z.object({
    appId: z.string().min(2).max(40).regex(/^[a-z0-9._-]+$/),
    backupId: z.string().uuid()
  })
});
const putSchema = z.object({
  params: paramsSchema.shape.params,
  body: z.object({
    data: z.record(z.any()),
    baseRevision: z.number().int().min(0).optional().default(0),
    deviceId: z.string().max(100).optional().default(''),
    checksum: z.string().length(64).regex(/^[a-f0-9]+$/i)
  })
});

function assertApp(appId) {
  if (!env.appIds.includes(appId)) throw new AppError(404, 'APP_NOT_FOUND', 'Aplicação não configurada.');
}

function summarize(data) {
  return {
    level: Number(data?.level) || 0,
    coins: Number(data?.coins) || 0,
    updatedStoreName: typeof data?.storeName === 'string' ? data.storeName.slice(0, 40) : undefined
  };
}

function saveData(row) {
  return row ? {
    appId: row.app_id,
    saveVersion: row.save_version,
    revision: row.revision,
    deviceId: row.device_id,
    data: row.data,
    checksum: row.checksum,
    updatedAt: row.updated_at
  } : null;
}

function backupData(row) {
  return {
    _id: row.id,
    revision: row.revision,
    deviceId: row.device_id,
    checksum: row.checksum,
    originalUpdatedAt: row.original_updated_at,
    createdAt: row.created_at
  };
}

async function createBackup(userId, row) {
  unwrap(await supabase.from('save_backups').insert({
    user_id: userId,
    app_id: row.app_id,
    save_version: row.save_version,
    revision: row.revision,
    device_id: row.device_id,
    data: row.data,
    checksum: row.checksum,
    original_updated_at: row.updated_at
  }));
}

async function pruneBackups(userId, appId) {
  const oldRows = unwrap(await supabase.from('save_backups').select('id')
    .eq('user_id', userId).eq('app_id', appId).order('revision', { ascending: false }).range(10, 9999));
  if (oldRows.length) {
    unwrap(await supabase.from('save_backups').delete().in('id', oldRows.map((row) => row.id)));
  }
}

saveRouter.get('/:appId', validate(paramsSchema), asyncHandler(async (req, res) => {
  const { appId } = req.validated.params;
  assertApp(appId);
  const row = unwrap(await supabase.from('saves').select('*')
    .eq('user_id', req.user._id).eq('app_id', appId).maybeSingle());
  ok(res, { save: saveData(row) });
}));

saveRouter.put('/:appId', saveLimiter, validate(putSchema), asyncHandler(async (req, res) => {
  const { appId } = req.validated.params;
  const { data, baseRevision, deviceId, checksum } = req.validated.body;
  assertApp(appId);
  if (Buffer.byteLength(stableJson(data), 'utf8') > 256 * 1024) {
    throw new AppError(413, 'SAVE_TOO_LARGE', 'O save excede o tamanho permitido.');
  }
  if (checksumJson(data) !== checksum.toLowerCase()) {
    throw new AppError(400, 'CHECKSUM_MISMATCH', 'Checksum inválido.');
  }

  const existing = unwrap(await supabase.from('saves').select('*')
    .eq('user_id', req.user._id).eq('app_id', appId).maybeSingle());
  if (existing && baseRevision < existing.revision) {
    throw new AppError(409, 'SAVE_CONFLICT', 'Existe um save mais recente no servidor.', {
      revision: existing.revision,
      updatedAt: existing.updated_at,
      deviceId: existing.device_id,
      summary: summarize(existing.data)
    });
  }

  const updatedAt = new Date().toISOString();
  if (existing) {
    await createBackup(req.user._id, existing);
    const changed = unwrap(await supabase.from('saves').update({
      revision: existing.revision + 1,
      device_id: deviceId,
      data,
      checksum: checksum.toLowerCase(),
      updated_at: updatedAt
    }).eq('id', existing.id).eq('revision', existing.revision).select('revision,updated_at,checksum').maybeSingle());
    if (!changed) throw new AppError(409, 'SAVE_CONFLICT', 'O save foi atualizado noutro dispositivo. Sincroniza novamente.');
    await pruneBackups(req.user._id, appId);
    ok(res, { revision: changed.revision, updatedAt: changed.updated_at, checksum: changed.checksum });
    return;
  }

  const inserted = unwrap(await supabase.from('saves').insert({
    user_id: req.user._id,
    app_id: appId,
    revision: 1,
    device_id: deviceId,
    data,
    checksum: checksum.toLowerCase(),
    updated_at: updatedAt
  }).select('revision,updated_at,checksum').single());
  ok(res, { revision: inserted.revision, updatedAt: inserted.updated_at, checksum: inserted.checksum }, 201);
}));

saveRouter.get('/:appId/backups', validate(paramsSchema), asyncHandler(async (req, res) => {
  const { appId } = req.validated.params;
  assertApp(appId);
  const rows = unwrap(await supabase.from('save_backups').select('id,revision,device_id,checksum,original_updated_at,created_at')
    .eq('user_id', req.user._id).eq('app_id', appId).order('revision', { ascending: false }));
  ok(res, { backups: rows.map(backupData) });
}));

saveRouter.post('/:appId/restore/:backupId', validate(backupParamsSchema), asyncHandler(async (req, res) => {
  const { appId, backupId } = req.validated.params;
  assertApp(appId);
  const backup = unwrap(await supabase.from('save_backups').select('*')
    .eq('id', backupId).eq('user_id', req.user._id).eq('app_id', appId).maybeSingle());
  if (!backup) throw new AppError(404, 'BACKUP_NOT_FOUND', 'Backup não encontrado.');
  const current = unwrap(await supabase.from('saves').select('*')
    .eq('user_id', req.user._id).eq('app_id', appId).maybeSingle());
  if (!current) throw new AppError(404, 'SAVE_NOT_FOUND', 'Save não encontrado.');
  await createBackup(req.user._id, current);
  const restored = unwrap(await supabase.from('saves').update({
    revision: current.revision + 1,
    data: backup.data,
    checksum: backup.checksum,
    device_id: backup.device_id,
    updated_at: new Date().toISOString()
  }).eq('id', current.id).eq('revision', current.revision).select('revision,updated_at,checksum').maybeSingle());
  if (!restored) throw new AppError(409, 'SAVE_CONFLICT', 'O save foi atualizado noutro dispositivo. Sincroniza novamente.');
  await pruneBackups(req.user._id, appId);
  ok(res, { revision: restored.revision, updatedAt: restored.updated_at, checksum: restored.checksum });
}));
