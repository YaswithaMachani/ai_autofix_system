/**
 * Error parser — extracts stack frames, error types, and affected source files.
 * Supports Node.js/Jest stack traces AND Python/pytest output.
 * Feeds the autofix pipeline with file paths to load for AI context.
 */
const path = require('path');
const fs = require('fs');
const config = require('../config');

// Node.js / JS stack frame pattern
const STACK_FRAME_RE = /\s+at\s+(?:async\s+)?(?:.*?\s+)?\(?((?:[A-Za-z]:)?[^():]+):(\d+):(\d+)\)?/g;
// Python / pytest file reference pattern: "path/to/file.py:line:"
const PYTHON_FILE_RE = /([A-Za-z]:[\\/.\w]+\.py|[./][\w/\\.-]+\.py)(?::\d+)?/g;
const ERROR_TYPE_RE = /^(\w+Error):\s*(.+)$/m;

function parseErrorOutput(stderr = '', stdout = '') {
  const combined = `${stderr}\n${stdout}`.trim();
  const frames = [];
  let match;

  // Extract Node.js / JS stack frames
  while ((match = STACK_FRAME_RE.exec(combined)) !== null) {
    const filePath = match[1].replace(/^file:\/\//, '');
    frames.push({
      file: path.normalize(filePath),
      line: Number(match[2]),
      column: Number(match[3])
    });
  }

  // Extract Python / pytest file references
  const pyRe = new RegExp(PYTHON_FILE_RE.source, 'g');
  while ((match = pyRe.exec(combined)) !== null) {
    const filePath = path.normalize(match[1]);
    if (!frames.find((f) => f.file === filePath)) {
      frames.push({ file: filePath, line: 0, column: 0 });
    }
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
    error.affectedFiles = inferFromMessage(error.message, combined);
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

function inferFromMessage(message, combined = '') {
  const hints = [];
  const searchText = `${message}\n${combined}`;

  // Legacy Node.js sample-app hints
  if (/discountRate|calculateDiscount/i.test(searchText)) {
    const f = path.join(config.sampleAppPath, 'utils', 'math.js');
    if (fs.existsSync(f)) hints.push(f);
  }
  if (/getUserProfile|lookupUser/i.test(searchText)) {
    const f = path.join(config.sampleAppPath, 'services', 'userService.js');
    if (fs.existsSync(f)) hints.push(f);
  }
  if (/fetchExternalData|fetch/i.test(searchText)) {
    const f = path.join(config.sampleAppPath, 'services', 'apiClient.js');
    if (fs.existsSync(f)) hints.push(f);
  }

  // Generic fallback: scan for source files in the project root
  // Excludes test files, __pycache__, node_modules, .git etc.
  if (hints.length === 0) {
    try {
      const sourceFiles = scanSourceFiles(config.sampleAppPath);
      hints.push(...sourceFiles);
    } catch (_) { /* ignore if path doesn't exist */ }
  }

  return hints;
}

/**
 * Recursively scans a directory for source files (non-test, non-vendor).
 * Returns absolute paths of files the AI is allowed to edit.
 */
function scanSourceFiles(dir, found = []) {
  if (!fs.existsSync(dir)) return found;
  const SKIP = new Set(['node_modules', '__pycache__', '.git', '.pytest_cache',
    'venv', '.venv', 'dist', 'build', 'coverage', 'fixed-reference']);
  const TEST_RE = /test_|_test\.|spec\.|\btest\b/i;
  const SOURCE_EXT = new Set(['.js', '.ts', '.py', '.go', '.rs', '.java', '.kt', '.rb', '.php']);

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      scanSourceFiles(full, found);
    } else if (
      SOURCE_EXT.has(path.extname(entry.name)) &&
      !TEST_RE.test(entry.name)
    ) {
      found.push(full);
    }
  }
  return found;
}

function detectFailure({ exitCode, stderr, stdout, testFailed }) {
  if (testFailed) return true;
  if (exitCode !== 0 && exitCode !== null) return true;
  const text = `${stderr}${stdout}`;
  // Node.js / Jest patterns
  const nodeFailure = /ReferenceError|TypeError|UnhandledPromiseRejection|FAIL\s|Error:/i.test(text);
  // Python / pytest patterns
  const pythonFailure = /FAILED|AssertionError|Traceback \(most recent call last\)|pytest|failed\s+\d+/i.test(text);
  // Generic patterns
  const genericFailure = /test failed|build failed|compilation error|syntax error/i.test(text);
  return nodeFailure || pythonFailure || genericFailure;
}

module.exports = { parseErrorOutput, detectFailure };
