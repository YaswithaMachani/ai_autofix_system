const { assertSafeCommand } = require('../src/security/shellGuard');
const { isPathAllowed, assertWritable } = require('../src/security/fileGuard');
const path = require('path');

describe('shellGuard', () => {
  it('allows npm test', () => {
    expect(() => assertSafeCommand('npm', ['test'])).not.toThrow();
  });

  it('blocks rm -rf', () => {
    expect(() => assertSafeCommand('sh', ['-c', 'rm -rf /'])).toThrow();
  });
});

describe('fileGuard', () => {
  it('allows sample-app paths', () => {
    const p = path.resolve('sample-app/utils/math.js');
    expect(isPathAllowed(p)).toBe(true);
  });

  it('blocks .env writes', () => {
    expect(() => assertWritable(path.resolve('.env'))).toThrow();
  });
});
