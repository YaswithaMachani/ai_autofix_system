/**
 * Error parser — extracts stack frames, error types, and affected source files.
 * Feeds the autofix pipeline with file paths to load for AI context.
 */
const path = require('path');
const config = require('../config');

const STACK_FRAME_RE = /\s+at\s+(?:async\s+)?(?:.*?\s+)?\(?((?:[A-Za-z]:)?[^():]+):(\d+):(\d+)\)?/g;
const ERROR_TYPE_RE = /^(\w+Error):\s*(.+)$/m;

function parseErrorOutput(stderr = '', stdout = '') {
  const combined = `${stderr}\n${stdout}`.trim();
  const frames = [];
  let match;

  while ((match = STACK_FRAME_RE.exec(combined)) !== null) {
    const filePath = match[1].replace(/^file:\/\//, '');
    frames.push({
      file: path.normalize(filePath),
      line: Number(match[2]),
      column: Number(match[3])
    });
  }

  const typeMatch = combined.match(ERROR_TYPE_RE);
  const error = {
    type: typeMatch ? typeMatch[1] : 'Error',
    message: typeMatch ? typeMatch[2] : combined.split('\n')[0] || 'Unknown error',
    frames,
    raw: combined
  };

  error.affectedFiles = dedupeProjectFiles(
    frames.map((f) => f.file).filter((f) => isUnderProject(f))
  );

  if (error.affectedFiles.length === 0) {
    error.affectedFiles = inferFromMessage(error.message);
  }

  return error;
}

function dedupeProjectFiles(files) {
  return [...new Set(files)];
}

function isUnderProject(filePath) {
  const resolved = path.resolve(filePath);
  return (
    resolved.startsWith(config.sampleAppPath) ||
    resolved.startsWith(config.projectRoot + path.sep)
  );
}

function inferFromMessage(message) {
  const hints = [];
  if (/discountRate|calculateDiscount/i.test(message)) {
    hints.push(path.join(config.sampleAppPath, 'utils', 'math.js'));
  }
  if (/getUserProfile|lookupUser/i.test(message)) {
    hints.push(path.join(config.sampleAppPath, 'services', 'userService.js'));
  }
  if (/fetchExternalData|fetch/i.test(message)) {
    hints.push(path.join(config.sampleAppPath, 'services', 'apiClient.js'));
  }
  return hints;
}

function detectFailure({ exitCode, stderr, stdout, testFailed }) {
  if (testFailed) return true;
  if (exitCode !== 0 && exitCode !== null) return true;
  const text = `${stderr}${stdout}`;
  return /ReferenceError|TypeError|UnhandledPromiseRejection|FAIL\s|Error:/i.test(text);
}

module.exports = { parseErrorOutput, detectFailure };
