import { describe, expect, it } from 'vitest';
import { canDecideApplication, formatAmount } from '../statusMeta';
import { ApplicationStatus } from '../types';

describe('canDecideApplication', () => {
  it('only allows deciding applications that are still PENDING', () => {
    expect(canDecideApplication(ApplicationStatus.PENDING)).toBe(true);
  });

  it('does not allow deciding already-decided or terminal applications', () => {
    expect(canDecideApplication(ApplicationStatus.APPROVED)).toBe(false);
    expect(canDecideApplication(ApplicationStatus.REJECTED)).toBe(false);
    expect(canDecideApplication(ApplicationStatus.CANCELLED)).toBe(false);
    expect(canDecideApplication(ApplicationStatus.DEFAULTED)).toBe(false);
  });
});

describe('formatAmount', () => {
  it('formats Prisma Decimal strings with two decimal places and thousands separators', () => {
    expect(formatAmount('1500')).toBe('1,500.00');
    expect(formatAmount('250.5')).toBe('250.50');
  });

  it('formats plain numbers the same way', () => {
    expect(formatAmount(1500)).toBe('1,500.00');
  });
});
