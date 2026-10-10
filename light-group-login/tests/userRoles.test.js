import { describe, expect, it } from 'vitest';
import { mapUser } from '../src/services/store.service.js';

const userRow = (values = {}) => ({
  id: 'dc990e4f-2e40-4a88-9e49-5e8f2a9dcf16',
  email: 'dev@example.com',
  username: 'dev-account',
  email_verified: true,
  failed_login_attempts: 0,
  lock_until: null,
  last_login_at: null,
  terms_accepted_at: new Date().toISOString(),
  terms_version: '1.0',
  marketing_opt_in: false,
  status: 'active',
  roles: ['user'],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...values
});

describe('user role serialization', () => {
  it('exposes server-assigned roles without exposing password hashes', () => {
    const safeUser = mapUser(userRow({ roles: ['user', 'developer'] })).toSafeJSON();

    expect(safeUser.roles).toEqual(['user', 'developer']);
    expect(safeUser).not.toHaveProperty('passwordHash');
  });

  it('keeps new accounts on the regular user role by default', () => {
    expect(mapUser(userRow()).toSafeJSON().roles).toEqual(['user']);
  });
});
