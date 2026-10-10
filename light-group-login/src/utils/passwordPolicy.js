import crypto from 'crypto';
import { env } from '../config/env.js';
import { logger } from './logger.js';
import { COMMON_PASSWORDS, simpleCommonVariants } from './commonPasswords.js';

const SYMBOL_RE = /[!@#$%^&*()\-_=\+[\]{};:,.?/\\|`~"'<>]/;
const OBVIOUS = ['123456', '234567', '345678', 'abcdef', 'qwerty', 'azerty', 'password', 'letmein'];

export function scorePassword(password) {
  let score = 0;
  if (password.length >= 12) score++;
  if (password.length >= 16) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (SYMBOL_RE.test(password)) score++;
  if (password.length >= 20 && new Set(password).size >= 10) score++;
  if (score <= 2) return 'fraca';
  if (score <= 4) return 'media';
  if (score === 5) return 'forte';
  return 'muito_forte';
}

export async function validatePasswordPolicy({ password, username = '', email = '' }) {
  const failures = [];
  const lower = password.toLowerCase();
  const emailLocal = String(email).split('@')[0]?.toLowerCase() || '';
  const usernameLower = String(username).toLowerCase();

  if (password.length < 12) failures.push('PASSWORD_MIN_LENGTH');
  if (password.length > 128) failures.push('PASSWORD_MAX_LENGTH');
  if (!/[a-z]/.test(password)) failures.push('PASSWORD_NEEDS_LOWERCASE');
  if (!/[A-Z]/.test(password)) failures.push('PASSWORD_NEEDS_UPPERCASE');
  if (!/\d/.test(password)) failures.push('PASSWORD_NEEDS_NUMBER');
  if (!SYMBOL_RE.test(password)) failures.push('PASSWORD_NEEDS_SYMBOL');
  if (password.trim() !== password) failures.push('PASSWORD_NO_EDGE_SPACES');
  if (usernameLower && lower.includes(usernameLower)) failures.push('PASSWORD_CONTAINS_USERNAME');
  if (emailLocal && lower.includes(emailLocal)) failures.push('PASSWORD_CONTAINS_EMAIL');
  if (simpleCommonVariants(password).some((candidate) => COMMON_PASSWORDS.has(candidate))) failures.push('PASSWORD_COMMON');
  if (OBVIOUS.some((sequence) => lower.includes(sequence))) failures.push('PASSWORD_OBVIOUS_SEQUENCE');
  if (/(.)\1\1\1/.test(password)) failures.push('PASSWORD_REPEATED_CHARS');

  if (env.HIBP_CHECK && failures.length === 0) {
    try {
      const sha1 = crypto.createHash('sha1').update(password).digest('hex').toUpperCase();
      const prefix = sha1.slice(0, 5);
      const suffix = sha1.slice(5);
      const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
        headers: { 'User-Agent': 'LightGroupLogin/1.0' }
      });
      if (response.ok) {
        const body = await response.text();
        if (body.split('\n').some((line) => line.startsWith(suffix))) failures.push('PASSWORD_BREACHED');
      }
    } catch (error) {
      logger.warn({ err: error }, 'HIBP indisponivel; validacao continua em modo fail-open.');
    }
  }

  return {
    ok: failures.length === 0,
    failures,
    score: scorePassword(password)
  };
}
