const path = require('path');
const {
  buildPrompt,
  extractCodeFromResponse,
  identifyAffectedFile
} = require('../scripts/openai');
const { writeErrorLog, readErrorLog, clearErrorLog } = require('../scripts/logger');
const { parseErrorOutput } = require('../src/parser/errorParser');
const config = require('../src/config');

describe('OpenAI pipeline', () => {
  beforeEach(() => {
    clearErrorLog();
  });

  it('writes and reads logs/error.log', () => {
    writeErrorLog('ReferenceError: discountRate is not defined');
    expect(readErrorLog()).toContain('discountRate');
  });

  it('builds fix prompt with logs, file, and code', () => {
    const prompt = buildPrompt({
      logs: 'TypeError: fail',
      filePath: path.join(config.sampleAppPath, 'utils', 'math.js'),
      code: 'const x = 1;'
    });
    expect(prompt).toContain('Error Logs:');
    expect(prompt).toContain('Return ONLY corrected code');
    expect(prompt).toContain('const x = 1;');
  });

  it('identifies affected file from stack trace', () => {
    const stderr = `ReferenceError: discountRate is not defined
    at calculateDiscount (${config.sampleAppPath.replace(/\\/g, '/')}/utils/math.js:9:26)`;
    const parsed = parseErrorOutput(stderr, '');
    const file = identifyAffectedFile(parsed);
    expect(file).toContain('math.js');
  });

  it('extracts code from fenced response', () => {
    const raw = '```javascript\nconst discountRate = 0.1;\n```';
    expect(extractCodeFromResponse(raw)).toContain('discountRate');
  });
});
