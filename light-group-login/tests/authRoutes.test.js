import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

const mocks = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  getUserByIdentifier: vi.fn(),
  getUserById: vi.fn(),
  updateUser: vi.fn(),
  insertAudit: vi.fn(),
  createAccessToken: vi.fn(),
  createRefreshToken: vi.fn(),
  setAuthCookies: vi.fn(),
  verifyAccessToken: vi.fn()
}));

vi.mock('../src/config/supabase.js', () => ({
  supabase: { auth: { admin: {} }, from: vi.fn() },
  createPublicSupabaseClient: () => ({ auth: { signInWithPassword: mocks.signInWithPassword } })
}));

vi.mock('../src/services/store.service.js', () => ({
  getUserByIdentifier: mocks.getUserByIdentifier,
  getUserById: mocks.getUserById,
  updateUser: mocks.updateUser,
  insertAudit: mocks.insertAudit,
  unwrap: (result) => result.data,
  mapUser: vi.fn()
}));

vi.mock('../src/services/token.service.js', () => ({
  createAccessToken: mocks.createAccessToken,
  createRefreshToken: mocks.createRefreshToken,
  setAuthCookies: mocks.setAuthCookies,
  clearAuthCookies: vi.fn(),
  verifyAccessToken: mocks.verifyAccessToken
}));

import { createApp } from '../src/app.js';

const profile = {
  _id: 'dc990e4f-2e40-4a88-9e49-5e8f2a9dcf16',
  email: 'user@example.com',
  username: 'florista',
  emailVerified: true,
  failedLoginAttempts: 0,
  lockUntil: null,
  status: 'active',
  roles: ['user'],
  toSafeJSON() {
    return { id: this._id, email: this.email, username: this.username, emailVerified: this.emailVerified, roles: this.roles };
  }
};

describe('Supabase-backed auth routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUserByIdentifier.mockResolvedValue(profile);
    mocks.signInWithPassword.mockResolvedValue({ error: null });
    mocks.updateUser.mockResolvedValue(profile);
    mocks.insertAudit.mockResolvedValue(undefined);
    mocks.createAccessToken.mockReturnValue('api-access-token');
    mocks.createRefreshToken.mockResolvedValue({ token: 'api-refresh-token', record: { id: 'session-id' } });
  });

  it('authenticates a username through its Supabase email account and returns API tokens', async () => {
    const app = createApp();
    const response = await request(app).post('/api/v1/auth/login').send({
      identifier: 'florista',
      password: 'Garden!River42Moon',
      rememberMe: true
    });

    expect(response.status).toBe(200);
    expect(response.body.data.user.username).toBe('florista');
    expect(response.body.data.accessToken).toBe('api-access-token');
    expect(response.body.data.refreshToken).toBe('api-refresh-token');
    expect(mocks.getUserByIdentifier).toHaveBeenCalledWith('florista');
    expect(mocks.signInWithPassword).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'Garden!River42Moon'
    });
  });

  it('requires an email during registration', async () => {
    const app = createApp();
    const response = await request(app).post('/api/v1/auth/register').send({
      username: 'florista',
      password: 'Garden!River42Moon',
      confirmPassword: 'Garden!River42Moon',
      acceptTerms: true,
      termsVersion: '1.0'
    });

    expect(response.status).toBe(400);
    expect(response.body.ok).toBe(false);
  });

  it('does not count an unverified account as a failed password attempt', async () => {
    mocks.getUserByIdentifier.mockResolvedValue({ ...profile, emailVerified: false });
    mocks.signInWithPassword.mockResolvedValue({
      error: { status: 400, code: 'email_not_confirmed' }
    });
    const app = createApp();
    const response = await request(app).post('/api/v1/auth/login').send({
      identifier: 'florista',
      password: 'Garden!River42Moon'
    });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('EMAIL_NOT_VERIFIED');
    expect(mocks.updateUser).not.toHaveBeenCalled();
  });

  it('serves the password-reset page used by recovery emails', async () => {
    const app = createApp();
    const response = await request(app).get('/demo/reset-password.html');

    expect(response.status).toBe(200);
    expect(response.text).toContain('Guardar palavra-passe');
  });

  it('rejects old MongoDB ObjectId access tokens without querying a UUID profile', async () => {
    mocks.verifyAccessToken.mockReturnValue({ sub: '64f15a32ab8820811d6a849a' });
    const app = createApp();
    const response = await request(app).get('/api/v1/users/me').set('Authorization', 'Bearer legacy-token');

    expect(response.status).toBe(401);
    expect(mocks.getUserById).not.toHaveBeenCalled();
  });
});
