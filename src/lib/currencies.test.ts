import { describe, expect, it } from 'vitest';
import { allCurrencyCodes, formatCurrency, isSupportedCurrency } from './currencies';

describe('currency registry', () => {
  it('supports key Arab-region and global currencies', () => {
    for (const code of ['SAR', 'AED', 'ILS', 'USD', 'EUR', 'JOD', 'EGP', 'MAD']) {
      expect(isSupportedCurrency(code)).toBe(true);
    }
  });

  it('rejects unknown codes', () => {
    expect(isSupportedCurrency('ABC')).toBe(false);
    expect(isSupportedCurrency('')).toBe(false);
  });

  it('keeps a comprehensive ISO registry without duplicates', () => {
    expect(allCurrencyCodes.length).toBeGreaterThan(150);
    expect(new Set(allCurrencyCodes).size).toBe(allCurrencyCodes.length);
  });

  it('formats values using the selected currency', () => {
    const formatted = formatCurrency(1250, 'USD');
    expect(formatted).toMatch(/1.?250|١.?٢٥٠/);
    expect(formatted).toMatch(/US\$|USD|دولار/);
  });
});
