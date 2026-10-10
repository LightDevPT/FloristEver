import 'dotenv/config';
import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { supabase } from '../src/config/supabase.js';
import { unwrap } from '../src/services/store.service.js';

const mongoUri = process.env.MONGODB_URI;
if (!mongoUri) throw new Error('Define MONGODB_URI para migrar os dados legados.');

const databaseName = process.env.MONGODB_DB_NAME || 'light-group-login';
const userIds = new Map();
let importedUsers = 0;
let skippedUsers = 0;
let importedSaves = 0;
let importedBackups = 0;
let importedAuditLogs = 0;

function sourceId(value) {
  return value?.toString();
}

async function getMapping(collection, id) {
  const source = sourceId(id);
  if (collection === 'users' && userIds.has(source)) return userIds.get(source);
  const row = unwrap(await supabase.from('migration_map').select('destination_id')
    .eq('source_collection', collection).eq('source_id', source).maybeSingle());
  if (row) {
    if (collection === 'users') userIds.set(source, row.destination_id);
    return row.destination_id;
  }
  return null;
}

async function saveMapping(collection, oldId, newId) {
  const source = sourceId(oldId);
  unwrap(await supabase.from('migration_map').upsert({
    source_collection: collection,
    source_id: source,
    destination_id: newId
  }, { onConflict: 'source_collection,source_id' }));
  if (collection === 'users') userIds.set(source, newId);
}

async function migrateUsers(database) {
  const users = await database.collection('users').find({}).toArray();
  for (const oldUser of users) {
    const source = sourceId(oldUser._id);
    const savedId = await getMapping('users', source);
    if (savedId) {
      userIds.set(source, savedId);
      continue;
    }

    const email = typeof oldUser.email === 'string' ? oldUser.email.trim().toLowerCase() : '';
    if (!email) {
      skippedUsers += 1;
      continue;
    }

    const conflictingProfile = unwrap(await supabase.from('profiles').select('id').eq('email_lower', email).maybeSingle());
    if (conflictingProfile) {
      throw new Error(`Já existe uma conta Supabase para um email legado sem mapeamento; resolve-a antes de continuar (registo legado: ${source}).`);
    }

    const temporaryPassword = crypto.randomBytes(48).toString('base64url');
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password: temporaryPassword,
      email_confirm: Boolean(oldUser.emailVerified),
      user_metadata: { username: oldUser.username }
    });
    if (error) throw new Error(`Não foi possível criar uma conta Auth durante a migração: ${error.message}`);

    const destinationId = data.user.id;
    const { error: profileError } = await supabase.from('profiles').insert({
      id: destinationId,
      email,
      username: oldUser.username,
      email_verified: Boolean(oldUser.emailVerified),
      failed_login_attempts: 0,
      lock_until: null,
      last_login_at: oldUser.lastLoginAt || null,
      terms_accepted_at: oldUser.termsAcceptedAt || oldUser.createdAt || new Date().toISOString(),
      terms_version: oldUser.termsVersion || '1.0',
      marketing_opt_in: Boolean(oldUser.marketingOptIn),
      status: oldUser.status === 'disabled' ? 'disabled' : 'active',
      roles: Array.isArray(oldUser.roles) && oldUser.roles.length ? oldUser.roles : ['user'],
      created_at: oldUser.createdAt || new Date().toISOString(),
      updated_at: oldUser.updatedAt || new Date().toISOString()
    });
    if (profileError) {
      const { error: cleanupError } = await supabase.auth.admin.deleteUser(destinationId);
      if (cleanupError) {
        throw new Error(`Falha ao criar o perfil (${profileError.message}) e ao limpar o utilizador Supabase (${cleanupError.message}).`);
      }
      throw new Error(`Não foi possível criar um perfil durante a migração: ${profileError.message}`);
    }
    await saveMapping('users', source, destinationId);
    importedUsers += 1;
  }
}

async function migrateSaves(database, sourceCollection, destinationCollection, countKey) {
  const cursor = database.collection(sourceCollection).find({});
  for await (const oldRow of cursor) {
    const existingId = await getMapping(sourceCollection, oldRow._id);
    if (existingId) continue;
    const userId = await getMapping('users', oldRow.userId);
    if (!userId) continue;

    const id = crypto.randomUUID();
    const values = {
      id,
      user_id: userId,
      app_id: oldRow.appId,
      save_version: oldRow.saveVersion || 1,
      revision: oldRow.revision || 1,
      device_id: oldRow.deviceId || '',
      data: oldRow.data,
      checksum: oldRow.checksum,
      created_at: oldRow.createdAt || new Date().toISOString()
    };
    if (destinationCollection === 'saves') {
      values.updated_at = oldRow.updatedAt || values.created_at;
      const { error } = await supabase.from(destinationCollection).upsert(values, { onConflict: 'user_id,app_id' });
      if (error) throw error;
      const inserted = unwrap(await supabase.from('saves').select('id').eq('user_id', userId).eq('app_id', oldRow.appId).single());
      await saveMapping(sourceCollection, oldRow._id, inserted.id);
    } else {
      values.original_updated_at = oldRow.originalUpdatedAt || oldRow.createdAt || new Date().toISOString();
      unwrap(await supabase.from(destinationCollection).insert(values));
      await saveMapping(sourceCollection, oldRow._id, id);
    }
    if (countKey === 'saves') importedSaves += 1;
    else importedBackups += 1;
  }
}

async function migrateAuditLogs(database) {
  const cursor = database.collection('auditlogs').find({});
  for await (const oldRow of cursor) {
    if (await getMapping('auditlogs', oldRow._id)) continue;
    const userId = oldRow.userId ? await getMapping('users', oldRow.userId) : null;
    const id = crypto.randomUUID();
    unwrap(await supabase.from('audit_logs').insert({
      id,
      user_id: userId,
      event: oldRow.event,
      ip: oldRow.ip || '',
      user_agent: oldRow.userAgent || '',
      meta: oldRow.meta || null,
      created_at: oldRow.createdAt || new Date().toISOString()
    }));
    await saveMapping('auditlogs', oldRow._id, id);
    importedAuditLogs += 1;
  }
}

try {
  await mongoose.connect(mongoUri, { dbName: databaseName, serverSelectionTimeoutMS: 10000 });
  const database = mongoose.connection.db;
  await migrateUsers(database);
  await migrateSaves(database, 'saves', 'saves', 'saves');
  await migrateSaves(database, 'savebackups', 'save_backups', 'backups');
  await migrateAuditLogs(database);
  console.log(JSON.stringify({
    importedUsers,
    skippedUsersWithoutEmail: skippedUsers,
    importedSaves,
    importedBackups,
    importedAuditLogs,
    note: 'Sessões e tokens temporários não são migrados. Todas as contas importadas devem repor a palavra-passe.'
  }, null, 2));
} finally {
  await mongoose.disconnect();
}
