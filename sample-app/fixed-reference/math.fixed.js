/**
 * Reference fix (not used at runtime) — documents expected AI outcome.
 */
function calculateDiscount(price) {
  if (typeof price !== 'number' || Number.isNaN(price)) {
    throw new TypeError('price must be a valid number');
  }
  const discountRate = 0.1;
  return price - price * discountRate;
}

module.exports = { calculateDiscount };
