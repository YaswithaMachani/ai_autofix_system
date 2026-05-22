/**
 * Sandbox file editing — only paths under ALLOWED_EDIT_PATHS may be written.
 */
const fs = require('fs');
const path = require('path');
const config = require('../config');

const FORBIDDEN_FILENAMES = new Set([
  '.env',
  'package-lock.json',
  'id_rsa',
  'credentials.json'
]);

function isPathAllowed(targetPath) {
  const resolved = path.resolve(targetPath);
  const allowed = config.allowedEditPaths.some(
    (root) => resolved === root || resolved.startsWith(root + path.sep)
  );
  if (!allowed) return false;

  const base = path.basename(resolved);
  if (FORBIDDEN_FILENAMES.has(base)) return false;
  if (resolved.includes('node_modules')) return false;
  if (resolved.includes('..')) return false;

  return true;
}

function assertWritable(targetPath) {
  if (!isPathAllowed(targetPath)) {
    throw new Error(`Write blocked for path: ${targetPath}`);
  }
  return true;
}

function readFileSafe(targetPath) {
  const resolved = path.resolve(targetPath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`File not found: ${resolved}`);
  }
  return fs.readFileSync(resolved, 'utf8');
}

function writeFileSafe(targetPath, content) {
  assertWritable(targetPath);
  const resolved = path.resolve(targetPath);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  fs.writeFileSync(resolved, content, 'utf8');
}

module.exports = {
  isPathAllowed,
  assertWritable,
  readFileSafe,
  writeFileSafe,
  FORBIDDEN_FILENAMES
};
