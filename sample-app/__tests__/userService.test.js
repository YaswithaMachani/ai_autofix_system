const { getUserProfile } = require('../services/userService');

describe('getUserProfile', () => {
  afterEach(async () => {
    // Flush delayed rejections from intentional missing-await bug
    await new Promise((resolve) => setTimeout(resolve, 30));
  });
  it('returns a resolved user object with name', async () => {
    const profile = await getUserProfile('1');
    expect(profile).toMatchObject({ id: '1', name: 'Ada Lovelace' });
    expect(profile.fetchedAt).toBeDefined();
  });

  it('rejects unknown users', async () => {
    await expect(getUserProfile('999')).rejects.toThrow(/not found/);
  });
});
