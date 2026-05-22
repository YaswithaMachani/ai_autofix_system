const { calculateDiscount } = require('../utils/math');

describe('calculateDiscount', () => {
  it('applies a 10% discount', () => {
    expect(calculateDiscount(100)).toBe(90);
  });

  it('rejects invalid price', () => {
    expect(() => calculateDiscount('x')).toThrow(TypeError);
  });
});
