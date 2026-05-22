const { buildFixPrompt, parseFixResponse } = require('../src/openai/promptManager');

describe('promptManager', () => {
  it('builds prompt with error and files', () => {
    const { system, user } = buildFixPrompt({
      parsedError: {
        type: 'ReferenceError',
        message: 'x is not defined',
        frames: [],
        affectedFiles: []
      },
      logExcerpt: 'test log',
      attempt: 1,
      maxAttempts: 3
    });
    expect(system).toContain('JSON');
    expect(user).toContain('ReferenceError');
  });

  it('parses AI JSON response', () => {
    const raw = JSON.stringify({
      summary: 'fix',
      files: [{ path: 'sample-app/utils/math.js', content: 'const x=1;\n' }]
    });
    const parsed = parseFixResponse(raw);
    expect(parsed.files).toHaveLength(1);
  });
});
