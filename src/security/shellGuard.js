/**
 * Prevents dangerous shell execution in spawned commands.
 */
const BLOCKED_PATTERNS = [
  /\brm\s+-rf\b/i,
  /\bformat\b/i,
  /\bdel\s+\/[sfq]/i,
  /\bmkfs\b/i,
  /\bdd\s+if=/i,
  /\bshutdown\b/i,
  /\breboot\b/i,
  /\bpoweroff\b/i,
  /\bcurl\b.*\|\s*(ba)?sh/i,
  /\bwget\b.*\|\s*(ba)?sh/i,
  /\beval\s*\(/i,
  /\bchild_process\b/i,
  />\s*\/dev\/sd/i,
  /\|\s*sudo\b/i,
  /\bsudo\s+/i,
  /\bchmod\s+[0-7]{3,4}\s+\/\s*/i
];

const ALLOWED_COMMANDS = new Set([
  'node',
  'npm',
  'npx',
  'jest',
  'eslint',
  'git'
]);

function assertSafeCommand(command, args = []) {
  const full = [command, ...args].join(' ').trim();
  if (!full) {
    throw new Error('Empty command rejected');
  }

  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(full)) {
      throw new Error(`Blocked dangerous command pattern: ${pattern}`);
    }
  }

  const base = pathBasename(command);
  if (!ALLOWED_COMMANDS.has(base)) {
    throw new Error(`Command not in allowlist: ${base}`);
  }

  if (/[;&|`$]/.test(full) && !isSimpleNpmScript(command, args)) {
    throw new Error('Shell metacharacters are not permitted');
  }

  return true;
}

function pathBasename(cmd) {
  const normalized = cmd.replace(/\\/g, '/');
  const parts = normalized.split('/');
  return parts[parts.length - 1].replace(/\.(exe|cmd|bat)$/i, '');
}

function isSimpleNpmScript(command, args) {
  const base = pathBasename(command);
  if (base !== 'npm' && base !== 'npx') return false;
  const joined = args.join(' ');
  return /^(test|run|exec)\b/.test(joined) && !/[;&|`$]/.test(joined);
}

module.exports = { assertSafeCommand, ALLOWED_COMMANDS };
