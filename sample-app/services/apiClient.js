// sample-app/utils/math.js
/**
 * Calculates a discount based on a given price.
 * 
 * @param {number} price - The price to calculate the discount for.
 * @param {number} [discountRate=0.1] - The discount rate (default is 10%).
 * @returns {number} The discounted price.
 */
function calculateDiscount(price, discountRate = 0.1) {
  if (typeof price !== 'number' || isNaN(price)) {
    throw new TypeError('price must be a valid number');
  }
  if (typeof discountRate !== 'number' || isNaN(discountRate)) {
    throw new TypeError('discountRate must be a valid number');
  }
  // Apply the discount correctly by subtracting the discount amount from the price
  return price * (1 - discountRate);
}

module.exports = { calculateDiscount };