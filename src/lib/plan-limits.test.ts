import { describe, expect, it } from 'vitest';
import { isWithinPlanLimit } from './plan-limits';

describe('plan limits', () => {
  it('allows writes that remain at or below the limit', () => {
    expect(isWithinPlanLimit(9, 1, 10)).toBe(true);
    expect(isWithinPlanLimit(0, 10, 10)).toBe(true);
  });

  it('blocks a batch that would cross the limit', () => {
    expect(isWithinPlanLimit(9, 2, 10)).toBe(false);
    expect(isWithinPlanLimit(10, 1, 10)).toBe(false);
  });
});
