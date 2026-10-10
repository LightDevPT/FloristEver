import { describe, expect, it } from 'vitest';
import { checksumJson, stableJson } from '../src/utils/crypto.js';

describe('save checksum helpers', () => {
  it('produces stable JSON independent of key order', () => {
    expect(stableJson({ b: 2, a: 1 })).toBe(stableJson({ a: 1, b: 2 }));
  });

  it('produces sha256 checksums', () => {
    expect(checksumJson({ level: 3 })).toMatch(/^[a-f0-9]{64}$/);
  });
});
