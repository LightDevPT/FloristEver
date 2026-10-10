import { supabase } from '../config/supabase.js';

export function unwrap(result) {
  if (result.error) throw result.error;
  return result.data;
}

export function mapUser(row) {
  if (!row) return null;
  return {
    _id: row.id,
    email: row.email,
    emailLower: row.email.toLowerCase(),
    username: row.username,
    usernameLower: row.username.toLowerCase(),
    emailVerified: row.email_verified,
    failedLoginAttempts: row.failed_login_attempts,
    lockUntil: row.lock_until,
    lastLoginAt: row.last_login_at,
    termsAcceptedAt: row.terms_accepted_at,
    termsVersion: row.terms_version,
    marketingOptIn: row.marketing_opt_in,
    status: row.status,
    roles: row.roles,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    toSafeJSON() {
      return {
        id: this._id,
        email: this.email,
        username: this.username,
        emailVerified: this.emailVerified,
        roles: this.roles,
        createdAt: this.createdAt,
        updatedAt: this.updatedAt,
        lastLoginAt: this.lastLoginAt
      };
    }
  };
}

export async function getUserById(id) {
  const row = unwrap(await supabase.from('profiles').select('*').eq('id', id).maybeSingle());
  return mapUser(row);
}

export async function getUserByIdentifier(identifier) {
  const field = identifier.includes('@') ? 'email_lower' : 'username_lower';
  const row = unwrap(await supabase.from('profiles').select('*').eq(field, identifier).maybeSingle());
  return mapUser(row);
}

export async function getUserByEmail(email) {
  const row = unwrap(await supabase.from('profiles').select('*').eq('email_lower', email.toLowerCase()).maybeSingle());
  return mapUser(row);
}

export async function getUserByUsername(username) {
  const row = unwrap(await supabase.from('profiles').select('*').eq('username_lower', username.toLowerCase()).maybeSingle());
  return mapUser(row);
}

export async function updateUser(id, changes) {
  const columns = {
    email: 'email',
    emailVerified: 'email_verified',
    failedLoginAttempts: 'failed_login_attempts',
    lockUntil: 'lock_until',
    lastLoginAt: 'last_login_at',
    marketingOptIn: 'marketing_opt_in',
    status: 'status',
    roles: 'roles',
    termsAcceptedAt: 'terms_accepted_at',
    termsVersion: 'terms_version',
    username: 'username'
  };
  const values = Object.fromEntries(Object.entries(changes)
    .filter(([key]) => columns[key])
    .map(([key, value]) => [columns[key], value]));
  values.updated_at = new Date().toISOString();
  return mapUser(unwrap(await supabase.from('profiles').update(values).eq('id', id).select('*').single()));
}

export async function insertAudit({ userId = null, event, ip = '', userAgent = '', meta = null }) {
  return unwrap(await supabase.from('audit_logs').insert({
    user_id: userId,
    event,
    ip,
    user_agent: userAgent,
    meta
  }));
}
