import { describe, expect, it } from 'vitest';
import ar from '../i18n/ar';
import en from '../i18n/en';

describe('i18n key parity', () => {
  it('ar.ts and en.ts expose the exact same set of translation keys', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(ar).sort());
  });

  it('no dictionary has an empty string value', () => {
    for (const [key, value] of Object.entries(ar)) {
      expect(value, `ar.${key}`).not.toBe('');
    }
    for (const [key, value] of Object.entries(en)) {
      expect(value, `en.${key}`).not.toBe('');
    }
  });
});
