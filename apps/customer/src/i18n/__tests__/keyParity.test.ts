import ar from '../ar';
import en from '../en';

describe('i18n key parity', () => {
  it('ar.ts and en.ts expose the exact same set of keys', () => {
    const arKeys = Object.keys(ar).sort();
    const enKeys = Object.keys(en).sort();

    expect(enKeys).toEqual(arKeys);
  });

  it('neither dictionary has empty string values', () => {
    const emptyInAr = Object.entries(ar).filter(([, value]) => value === '');
    const emptyInEn = Object.entries(en).filter(([, value]) => value === '');

    expect(emptyInAr.map(([key]) => key)).toEqual([]);
    expect(emptyInEn.map(([key]) => key)).toEqual([]);
  });
});
