import { describe, expect, it } from 'vitest';
import { calculateDistance } from '@/utils/geo';

describe('calculateDistance', () => {
  it('returns zero for identical points', () => {
    const distance = calculateDistance({ latitude: 59.33, longitude: 18.06 }, { latitude: 59.33, longitude: 18.06 });
    expect(distance).toBeCloseTo(0);
  });

  it('returns symmetric distances', () => {
    const a = { latitude: 59.33, longitude: 18.06 };
    const b = { latitude: 57.71, longitude: 11.97 };
    const ab = calculateDistance(a, b);
    const ba = calculateDistance(b, a);
    expect(ab).toBeCloseTo(ba, 5);
  });
});
