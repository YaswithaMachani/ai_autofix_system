const { fetchExternalData } = require('../services/apiClient');

describe('fetchExternalData', () => {
  it('throws on non-OK HTTP responses', async () => {
    await expect(
      fetchExternalData('https://httpbin.org/status/404')
    ).rejects.toThrow();
  });

  it('returns JSON on success', async () => {
    const data = await fetchExternalData('https://httpbin.org/json');
    expect(data).toBeDefined();
  });
});
