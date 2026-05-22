/**
 * Retry loop — max 3 AI fix attempts (configurable).
 */
const config = require('../src/config');
const { createLogger, appendPipelineLog } = require('./logger');

const log = createLogger('retry');

async function withRetry(fn, options = {}) {
  const maxAttempts = options.maxAttempts ?? config.MAX_AI_FIX_ATTEMPTS;
  let lastResult = null;
  let lastError = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    appendPipelineLog('retry_attempt', { attempt, maxAttempts });
    log.info('Retry attempt', { attempt, maxAttempts });

    try {
      const result = await fn({ attempt, maxAttempts });
      if (result?.success) {
        appendPipelineLog('retry_success', { attempt });
        return { ...result, attempt, maxAttempts };
      }
      lastResult = result;
      lastError = new Error(result?.error || 'Validation failed');
      appendPipelineLog('retry_validation_failed', { attempt, error: lastError.message });
    } catch (err) {
      lastError = err;
      appendPipelineLog('retry_error', { attempt, error: err.message });
      log.error('Attempt error', { attempt, error: err.message });
    }
  }

  return {
    success: false,
    attempt: maxAttempts,
    maxAttempts,
    error: lastError?.message || 'All attempts exhausted',
    lastResult
  };
}

module.exports = { withRetry };
