// sample-app/services/userService.js
const users = {
  '1': { id: '1', name: 'Ada Lovelace' },
};

/**
 * Gets a user's profile.
 * 
 * @param {string} id - The user's ID.
 * @returns {Promise<object>} A promise that resolves with the user's profile.
 */
async function getUserProfile(id) {
  return new Promise((resolve, reject) => {
    const user = users[id];
    if (!user) {
      reject(new Error(`User not found: ${id}`));
      return;
    }
    const profile = { ...user, fetchedAt: new Date().toISOString() };
    resolve(profile);
  });
}

module.exports = { getUserProfile };

// sample-app/utils/math.js
/**
 * Calculates a discount based on a given price.
 * 
 * @param {number} price - The price to calculate the discount for.
 * @param {number} discountRate - The discount rate.
 * @returns {number} The discounted price.
 */
function calculateDiscount(price, discountRate) {
  if (typeof price !== 'number' || isNaN(price)) {
    throw new TypeError('price must be a valid number');
  }
  if (typeof discountRate !== 'number' || isNaN(discountRate)) {
    throw new TypeError('discountRate must be a valid number');
  }
  return price - price * discountRate;
}

module.exports = { calculateDiscount };

// sample-app/services/apiClient.js
/**
 * Fetches external data from a given URL.
 * 
 * @param {string} url - The URL to fetch data from.
 * @returns {Promise<object>} A promise that resolves with the fetched data.
 */
async function fetchExternalData(url) {
  try {
    const response = await globalThis.fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    throw error;
  }
}

module.exports = { fetchExternalData };