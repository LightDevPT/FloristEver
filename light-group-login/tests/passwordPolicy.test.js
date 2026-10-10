import { beforeAll, describe, expect, it } from 'vitest';

beforeAll(() => {
  process.env.NODE_ENV = 'test';
  process.env.JWT_ACCESS_SECRET = '123456789012345678901234567890123456789012345678';
  process.env.HIBP_CHECK = 'false';
});

describe('password policy', () => {
  it('accepts a strong password', async () => {
    const { validatePasswordPolicy } = await import('../src/utils/passwordPolicy.js');
    const result = await validatePasswordPolicy({
      password: 'Garden!River42Moon',
      username: 'florista',
      email: 'user@example.com'
    });
    expect(result.ok).toBe(true);
  });

  it('rejects missing required classes and short passwords', async () => {
    const { validatePasswordPolicy } = await import('../src/utils/passwordPolicy.js');
    const result = await validatePasswordPolicy({
      password: 'short',
      username: 'florista',
      email: 'user@example.com'
    });
    expect(result.ok).toBe(false);
    expect(result.failures).toContain('PASSWORD_MIN_LENGTH');
    expect(result.failures).toContain('PASSWORD_NEEDS_UPPERCASE');
    expect(result.failures).toContain('PASSWORD_NEEDS_NUMBER');
    expect(result.failures).toContain('PASSWORD_NEEDS_SYMBOL');
  });

  it('rejects username, email local part, common words, sequences and repeats', async () => {
    const { validatePasswordPolicy } = await import('../src/utils/passwordPolicy.js');
    const result = await validatePasswordPolicy({
      password: 'Florista123456!!!!',
      username: 'florista',
      email: 'garden@example.com'
    });
    expect(result.ok).toBe(false);
    expect(result.failures).toContain('PASSWORD_CONTAINS_USERNAME');
    expect(result.failures).toContain('PASSWORD_OBVIOUS_SEQUENCE');
    expect(result.failures).toContain('PASSWORD_REPEATED_CHARS');
  });
});
