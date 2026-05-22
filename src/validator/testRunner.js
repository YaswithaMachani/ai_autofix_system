/**
 * Universal fix validation — runs TEST_COMMAND and LINT_COMMAND after AI applies patches.
 * Supports Node.js (Jest/ESLint), Python (pytest/flake8), MERN, Go, Rust, Java, and more.
 * Both must pass before GitHub publish; otherwise retry or rollback.
 */
const { spawn } = require('child_process');
const config = require('../config');
const { createLogger } = require('../logger');
const { assertSafeCommand } = require('../security/shellGuard');
const { detectFailure } = require('../parser/errorParser');

const log = createLogger('validator');

/**
 * Parses a command string like "npm test" or "pytest -v" into { cmd, args[] }
 */
function parseCommand(commandStr) {
  const parts = commandStr.trim().split(/\s+/);
  return { cmd: parts[0], args: parts.slice(1) };
}

/**
 * Resolves the correct binary name for the current platform.
 * e.g. npm → npm.cmd on Windows
 */
function resolveBin(cmd) {
  if (process.platform === 'win32') {
    if (/^(npm|npx)$/i.test(cmd)) return `${cmd}.cmd`;
  }
  return cmd;
}

function runCommand(commandStr, options = {}) {
  const { cmd, args } = parseCommand(commandStr);
  const resolvedCmd = resolveBin(cmd);
  assertSafeCommand(resolvedCmd, args);

  const useShell = options.useShell ?? (process.platform === 'win32' && /\.cmd$/i.test(resolvedCmd));

  return new Promise((resolve) => {
    const child = spawn(resolvedCmd, args, {
      cwd: config.projectRoot,
      shell: useShell,
      env: { ...process.env, CI: 'true', ...options.env },
      ...options.spawnOptions
    });

    let stdout = '';
    let stderr = '';
    child.stdout?.on('data', (d) => { stdout += d.toString(); });
    child.stderr?.on('data', (d) => { stderr += d.toString(); });
    child.on('close', (code) => {
      resolve({ exitCode: code ?? 1, stdout, stderr });
    });
  });
}

async function runTests() {
  log.info(`Running tests [${config.language}]: ${config.testCommand}`);
  return runCommand(config.testCommand, {
    env: config.language === 'node' ? { NODE_OPTIONS: '--experimental-vm-modules' } : {}
  });
}

async function runLint() {
  // Skip lint if not configured (set LINT_COMMAND=none to disable)
  if (!config.lintCommand || config.lintCommand.toLowerCase() === 'none') {
    log.info('Lint skipped (LINT_COMMAND=none)');
    return { exitCode: 0, stdout: '', stderr: '' };
  }
  log.info(`Running lint [${config.language}]: ${config.lintCommand}`);
  return runCommand(config.lintCommand);
}

async function validateFix() {
  const testResult = await runTests();
  const lintResult = await runLint();

  const testFailed = detectFailure({
    exitCode: testResult.exitCode,
    stderr: testResult.stderr,
    stdout: testResult.stdout,
    testFailed: testResult.exitCode !== 0
  });

  const lintFailed = lintResult.exitCode !== 0;

  const passed = !testFailed && !lintFailed;
  const combined = {
    passed,
    testResult,
    lintResult,
    stderr: `${testResult.stderr}\n${lintResult.stderr}`,
    stdout: `${testResult.stdout}\n${lintResult.stdout}`
  };

  log.info('Validation finished', { passed, testFailed, lintFailed });
  return combined;
}

module.exports = { runTests, runLint, validateFix, runCommand };
