/**
 * Returns a user profile object with the given ID.
 * 
 * @param {string} id - The ID of the user to retrieve.
 * @returns {Promise<Object>} A Promise that resolves to the user profile object.
 */
const users = {
  '1': { id: '1', name: 'Ada Lovelace' },
  '2': { id: '2', name: 'Grace Hopper' }
};

/**
 * Looks up a user by ID and returns a Promise that resolves to the user object.
 * 
 * @param {string} id - The ID of the user to retrieve.
 * @returns {Promise<Object>} A Promise that resolves to the user object.
 */
function lookupUser(id) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const user = users[id];
      if (!user) {
        reject(new Error(`User not found: ${id}`));
        return;
      }
      resolve(user);
    }, 10);
  });
}

/**
 * Retrieves a user profile object with the given ID.
 * 
 * @param {string} id - The ID of the user to retrieve.
 * @returns {Promise<Object>} A Promise that resolves to the user profile object.
 */
async function getUserProfile(id) {
  try {
    const user = await lookupUser(id);
    return {
      id: user.id,
      name: user.name,
      fetchedAt: new Date().toISOString()
    };
  } catch (error) {
    throw error;
  }
}

/**
 * Calculates the price after applying a discount.
 * 
 * @param {number} price - The original price.
 * @returns {number} The price after applying a discount.
 */
function calculateDiscount(price) {
  if (typeof price !== 'number' || price < 0) {
    throw new Error('Invalid price');
  }
  return price * 0.9; // Apply a 10% discount
}

module.exports = { getUserProfile, lookupUser, calculateDiscount };