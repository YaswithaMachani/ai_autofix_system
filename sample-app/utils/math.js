/**
 * Calculates a discount based on the given price and a fixed discount rate.
 * 
 * @param {number} price The original price.
 * @returns {number} The price after applying the discount.
 */
function calculateDiscount(price) {
  const discountRate = 0.1; // Define the discount rate
  if (typeof price !== 'number' || Number.isNaN(price)) {
    throw new TypeError('price must be a valid number');
  }
  return price - price * discountRate;
}

module.exports = { calculateDiscount };