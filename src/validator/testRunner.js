/**
 * Fix validation — runs Jest and ESLint after AI applies patches.
 * Both must pass before GitHub publish; otherwise retry or rollback.
 */
const { spawn } = require('child_process');
const config = require('../config');
const { createLogger } = require('../logger');
const { assertSafeCommand } = require('../security/shellGuard');
const { detectFailure } = require('../parser/errorParser');

const log = createLogger('validator');

function runCommand(command, args, options = {}) {
  assertSafeCommand(command, args);
  const useShell =
    options.useShell ?? (process.platform === 'win32' && /\.cmd$/i.test(command));
  return new Promise((resolve) => {
    const child = spawn(command, args, {
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
  log.info('Running Jest tests');
  const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  return runCommand(npmCmd, ['test', '--', '--runInBand', 'sample-app'], {
    env: { NODE_OPTIONS: '--experimental-vm-modules' }
  });
}

async function runLint() {
  log.info('Running ESLint');
  const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  return runCommand(npmCmd, ['run', 'lint']);
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
