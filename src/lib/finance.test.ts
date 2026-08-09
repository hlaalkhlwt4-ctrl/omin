import { describe, expect, it } from 'vitest';
import { calculateNetCashflow, calculateOrderTotal, roundMoney } from './finance';

describe('financial calculations', () => {
  it('calculates order lines and rounds to two decimals', () => {
    expect(calculateOrderTotal([{ price: 19.995, quantity: 2 }, { price: 10, quantity: 1 }])).toBe(49.99);
  });

  it('calculates collected, spent and net cashflow', () => {
    expect(calculateNetCashflow([{ amount: 100 }, { amount: 25.5 }], [{ amount: 20 }, { amount: 5.25 }])).toEqual({ collected: 125.5, spent: 25.25, net: 100.25 });
  });

  it('handles floating point currency safely', () => {
    expect(roundMoney(0.1 + 0.2)).toBe(0.3);
  });
});
