import { describe, expect, it } from 'vitest';
import type { Tables } from '@/lib/types';
import { parseMethodScheme } from 'src/utils/methods';

describe('parseMethodScheme', () => {
  it('uses defaults when scheme missing', () => {
    const result = parseMethodScheme(null as unknown as Tables<'workout_methods'>);
    expect(result.sets).toBe(3);
    expect(result.reps).toEqual([10, 10, 10]);
  });

  it('extracts values from scheme', () => {
    const method = {
      scheme: { sets: 5, reps: [5, 5, 5, 5, 5], duration_seconds: 600, notes: 'AMRAP' },
    } as Tables<'workout_methods'>;
    const result = parseMethodScheme(method);
    expect(result.sets).toBe(5);
    expect(result.reps).toEqual([5, 5, 5, 5, 5]);
    expect(result.durationSeconds).toBe(600);
    expect(result.notes).toBe('AMRAP');
  });
});
