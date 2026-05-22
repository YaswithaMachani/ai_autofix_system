const { parseErrorOutput, detectFailure } = require('../src/parser/errorParser');

describe('errorParser', () => {
  it('parses stack frames and error type', () => {
    const stderr = `ReferenceError: discountRate is not defined
    at calculateDiscount (C:\\proj\\sample-app\\utils\\math.js:8:24)`;
    const parsed = parseErrorOutput(stderr, '');
    expect(parsed.type).toBe('ReferenceError');
    expect(parsed.message).toContain('discountRate');
    expect(parsed.frames.length).toBeGreaterThan(0);
  });

  it('detects test failures', () => {
    expect(
      detectFailure({ exitCode: 1, stderr: 'FAIL sample-app', stdout: '', testFailed: true })
    ).toBe(true);
  });
});
