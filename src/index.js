/**
 * Express API — n8n + GitHub Actions integration.
 */
const express = require('express');
const config = require('./config');
const { createLogger } = require('./logger');
const { runAutofixPipeline } = require('./autofix/runner');
const { runSampleApp } = require('./monitor/processMonitor');
const { validateFix, runTests } = require('./validator/testRunner');
const { detectFailure } = require('./parser/errorParser');
const { writeErrorLog, appendPipelineLog } = require('../scripts/logger');

const log = createLogger('api');
const app = express();

app.use(express.json({ limit: '1mb' }));

function checkSecret(req, res, next) {
  if (!config.API_SECRET) return next();
  const header = req.headers['x-api-secret'];
  if (header !== config.API_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  return next();
}

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'ai-autofix-system' });
});

app.post('/api/monitor/run', checkSecret, async (_req, res) => {
  try {
    const result = await runSampleApp();
    res.json(result);
  } catch (err) {
    log.error('Monitor run failed', { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

/** CI / n8n step 3 & 6 — run tests and write logs/error.log on failure */
app.post('/api/ci/run-tests', checkSecret, async (_req, res) => {
  try {
    appendPipelineLog('ci_run_tests', {});
    const testResult = await runTests();
    const failed = detectFailure({
      exitCode: testResult.exitCode,
      stderr: testResult.stderr,
      stdout: testResult.stdout,
      testFailed: testResult.exitCode !== 0
    });
    if (failed) {
      writeErrorLog(`${testResult.stderr}\n${testResult.stdout}`);
    }
    res.json({
      failed,
      success: !failed,
      exitCode: testResult.exitCode
    });
  } catch (err) {
    res.status(500).json({ error: err.message, failed: true });
  }
});

/** n8n / GitHub Actions — full bug-fix pipeline */
app.post('/api/autofix/run', checkSecret, async (req, res) => {
  try {
    const result = await runAutofixPipeline(req.body || {});
    res.json(result);
  } catch (err) {
    log.error('Autofix run failed', { error: err.message });
    res.status(500).json({ error: err.message, success: false });
  }
});

/** Webhook entry when GitHub Actions fails (forward to autofix) */
app.post('/api/n8n/webhook', checkSecret, async (req, res) => {
  try {
    appendPipelineLog('n8n_webhook', { source: req.body?.source });
    if (!req.body?.failed) {
      return res.json({ skipped: true, reason: 'No failure reported' });
    }
    const result = await runAutofixPipeline({ force: true });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message, success: false });
  }
});

app.post('/api/validate', checkSecret, async (_req, res) => {
  try {
    const result = await validateFix();
    res.json({ ...result, success: result.passed });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

if (require.main === module) {
  app.listen(config.PORT, () => {
    log.info(`API listening on port ${config.PORT}`);
  });
}

module.exports = app;
