/**
 * Retry mechanism — maximum 3 AI fixing attempts (configurable via MAX_AI_FIX_ATTEMPTS).
 */
const config = require('../config');
const { createLogger } = require('../logger');

const log = createLogger('retry');

async function withRetry(fn, options = {}) {
  const maxAttempts = options.maxAttempts ?? config.MAX_AI_FIX_ATTEMPTS;
  let lastError = null;
  let lastResult = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    log.info('Retry attempt started', { attempt, maxAttempts });
    try {
      const result = await fn({ attempt, maxAttempts });
      if (result?.success) {
        return { ...result, attempt, maxAttempts };
      }
      lastResult = result;
      lastError = new Error(result?.error || 'Attempt failed validation');
    } catch (err) {
      lastError = err;
      log.error('Attempt threw', { attempt, error: err.message });
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
