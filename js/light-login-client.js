import { TERMS_VERSION } from './config/terms.js';

const ACCESS_KEY = 'light_group_access_token';
const REFRESH_KEY = 'light_group_refresh_token';
const API_BASE_KEY = 'light_group_api_base';
const DEVICE_ID_KEY = 'light_group_device_id';
const REVISION_KEY = 'floristever_cloud_revision';
function getDefaultApiBase() {
  const stored = localStorage.getItem(API_BASE_KEY);
  if (stored) return stored.replace(/\/$/, '');
  const configured = document.querySelector('meta[name="light-login-api-base"]')?.content;
  if (configured) return configured.replace(/\/$/, '');
  if (location.protocol === 'http:' || location.protocol === 'https:') {
    return `${location.origin}/api/v1`;
  }
  return 'http://localhost:4000/api/v1';
}

function getDeviceId() {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

function stableJson(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
}

async function sha256Hex(value) {
  const encoded = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', encoded);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export class LightLoginClient {
  constructor({ appId = 'floristever', apiBase = getDefaultApiBase() } = {}) {
    this.appId = appId;
    this.apiBase = apiBase.replace(/\/$/, '');
    this.deviceId = getDeviceId();
    this.user = null;
    this.syncEnabled = false;
  }

  get accessToken() {
    return localStorage.getItem(ACCESS_KEY);
  }

  get refreshToken() {
    return localStorage.getItem(REFRESH_KEY);
  }

  get cloudRevision() {
    return Number(localStorage.getItem(REVISION_KEY)) || 0;
  }

  set cloudRevision(value) {
    localStorage.setItem(REVISION_KEY, String(Number(value) || 0));
  }

  setApiBase(apiBase) {
    this.apiBase = apiBase.replace(/\/$/, '');
    localStorage.setItem(API_BASE_KEY, this.apiBase);
  }

  async request(path, options = {}, retry = true) {
    const headers = new Headers(options.headers || {});
    headers.set('Content-Type', 'application/json');
    const token = this.accessToken;
    if (token) headers.set('Authorization', `Bearer ${token}`);

    const response = await fetch(`${this.apiBase}${path}`, {
      ...options,
      headers,
      credentials: 'include'
    });
    const payload = await response.json().catch(() => ({ ok: false, error: { message: 'Resposta inválida.' } }));
    if (response.status === 401 && retry && this.refreshToken) {
      const refreshed = await this.refresh();
      if (refreshed) return this.request(path, options, false);
    }
    if (!response.ok || payload.ok === false) {
      const error = new Error(payload.error?.message || 'Pedido falhou.');
      error.code = payload.error?.code;
      error.details = payload.error?.details;
      error.status = response.status;
      throw error;
    }
    return payload.data;
  }

  saveTokens(data) {
    if (data.accessToken) localStorage.setItem(ACCESS_KEY, data.accessToken);
    if (data.refreshToken) localStorage.setItem(REFRESH_KEY, data.refreshToken);
  }

  async register({ email, username, password, confirmPassword, termsVersion }) {
    if (termsVersion !== TERMS_VERSION) {
      throw new Error('A aceitação dos Termos atual é obrigatória para criar uma conta.');
    }
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email,
        username,
        password,
        confirmPassword,
        acceptTerms: true,
        termsVersion
      })
    }, false);
  }

  async login({ identifier, password, rememberMe = true }) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password, rememberMe, deviceInfo: navigator.userAgent.slice(0, 180) })
    }, false);
    this.saveTokens(data);
    this.user = data.user;
    this.syncEnabled = true;
    return data;
  }

  async requestPasswordReset(email) {
    return this.request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email })
    }, false);
  }

  async resendEmailVerification(email) {
    return this.request('/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email })
    }, false);
  }

  async refresh() {
    const response = await fetch(`${this.apiBase}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ refreshToken: this.refreshToken, deviceInfo: navigator.userAgent.slice(0, 180) })
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.ok) {
      if (response.status === 401 || response.status === 403) {
        this.clearSession();
        return false;
      }
      if (!response.ok) {
        const error = new Error(payload?.error?.message || 'Não foi possível renovar a sessão.');
        error.status = response.status;
        throw error;
      }
      throw new Error(payload?.error?.message || 'Resposta inválida ao renovar a sessão.');
    }
    this.saveTokens(payload.data);
    return true;
  }

  async logout() {
    try {
      await this.request('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refreshToken: this.refreshToken })
      }, false);
    } finally {
      this.clearSession();
    }
  }

  clearSession() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    this.user = null;
    this.syncEnabled = false;
  }

  async me() {
    const data = await this.request('/users/me');
    this.user = data.user;
    return data.user;
  }

  async getSave() {
    return this.request(`/saves/${encodeURIComponent(this.appId)}`);
  }

  async putSave(data, { force = false } = {}) {
    const checksum = await sha256Hex(stableJson(data));
    const result = await this.request(`/saves/${encodeURIComponent(this.appId)}`, {
      method: 'PUT',
      body: JSON.stringify({
        data,
        baseRevision: force ? Number.MAX_SAFE_INTEGER : this.cloudRevision,
        deviceId: this.deviceId,
        checksum
      })
    });
    this.cloudRevision = result.revision;
    return result;
  }
}

export const lightLoginClient = new LightLoginClient();
