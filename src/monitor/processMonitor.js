/**
 * Process monitor — runs sample app, captures stdout/stderr for error detection.
 */
const { spawn } = require('child_process');
const path = require('path');
const config = require('../config');
const { createLogger } = require('../logger');
const { assertSafeCommand } = require('../security/shellGuard');
const { parseErrorOutput, detectFailure } = require('../parser/errorParser');

const log = createLogger('monitor');

async function runSampleApp({ timeoutMs = 8000 } = {}) {
  const entry = path.join(config.sampleAppPath, 'index.js');
  assertSafeCommand('node', [entry]);

  return new Promise((resolve) => {
    const buffers = { stdout: '', stderr: '' };
    const child = spawn('node', [entry], {
      cwd: config.projectRoot,
      shell: false,
      env: { ...process.env, SAMPLE_PORT: '3099' }
    });

    child.stdout.on('data', (d) => {
      const text = d.toString();
      buffers.stdout += text;
      log.info('sample stdout', { chunk: text.trim() });
    });

    child.stderr.on('data', (d) => {
      const text = d.toString();
      buffers.stderr += text;
      log.error('sample stderr', { chunk: text.trim() });
    });

    const timer = setTimeout(() => {
      child.kill('SIGTERM');
    }, timeoutMs);

    child.on('close', (exitCode) => {
      clearTimeout(timer);
      const failed = detectFailure({
        exitCode,
        stderr: buffers.stderr,
        stdout: buffers.stdout
      });
      const parsedError = parseErrorOutput(buffers.stderr, buffers.stdout);

      log.info('Sample app run finished', { exitCode, failed });
      resolve({
        exitCode,
        failed,
        parsedError,
        ...buffers
      });
    });
  });
}

async function probeRoutes() {
  const base = `http://127.0.0.1:${process.env.SAMPLE_PORT || 3099}`;
  const results = [];
  try {
    const health = await fetch(`${base}/health`);
    results.push({ route: '/health', ok: health.ok });
    const discount = await fetch(`${base}/discount/100`);
    results.push({ route: '/discount/100', ok: discount.ok, status: discount.status });
  } catch (err) {
    results.push({ error: err.message });
  }
  return results;
}

module.exports = { runSampleApp, probeRoutes };
