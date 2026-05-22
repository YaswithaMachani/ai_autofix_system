#!/usr/bin/env node
/**
 * Bug-fix script — OpenAI pipeline with retry, validation, GitHub PR, Discord.
 *
 * Flow:
 * 1. Read logs/error.log + parse stack trace
 * 2. OpenAI fix → safe overwrite (fileGuard)
 * 3. Rerun tests + ESLint
 * 4. On success: autofix/* branch + PR (never main)
 * 5. On failure: rollback + Discord
 */
require('dotenv').config();
const path = require('path');
const config = require('../src/config');
const { parseErrorOutput } = require('../src/parser/errorParser');
const { validateFix, runTests } = require('../src/validator/testRunner');
const { writeFileSafe, isPathAllowed } = require('../src/security/fileGuard');
const {
  createSessionId,
  backupFiles,
  rollbackSession,
  cleanupSession
} = require('../src/rollback/backupManager');
const { sendDiscordAlert } = require('../src/notifications/discord');
const { identifyAffectedFile, runOpenAIFixPipeline } = require('./openai');
const { withRetry } = require('./retry');
const { publishFix } = require('./github');
const {
  createLogger,
  readErrorLog,
  writeErrorLog,
  appendPipelineLog
} = require('./logger');

const log = createLogger('autofix');

function applyFixFiles(files) {
  const written = [];
  for (const file of files) {
    const target = path.resolve(config.projectRoot, file.path);
    if (!isPathAllowed(target)) {
      throw new Error(`AI attempted to modify disallowed path: ${file.path}`);
    }
    writeFileSafe(target, file.content);
    written.push(target);
    appendPipelineLog('file_overwrite', { path: file.path, bytes: file.content.length });
  }
  return written;
}

async function runAutofixPipeline(initialContext = {}) {
  const sessionId = createSessionId();
  appendPipelineLog('pipeline_start', { sessionId });

  const testResult = initialContext.testResult || (await runTests());
  if (testResult.exitCode === 0 && !initialContext.force) {
    log.info('Tests passed; skipping autofix');
    return { success: true, skipped: true };
  }

  const errorLogContent =
    initialContext.errorLogs ||
    readErrorLog() ||
    `${testResult.stderr}\n${testResult.stdout}`;
  writeErrorLog(`${testResult.stderr}\n${testResult.stdout}`);

  const parsedError =
    initialContext.parsedError ||
    parseErrorOutput(errorLogContent, testResult.stdout);

  const primaryFile = identifyAffectedFile(parsedError);
  const affected = parsedError.affectedFiles.length
    ? parsedError.affectedFiles
    : [primaryFile];

  const backup = backupFiles(affected, sessionId);
  log.info('Backup ready', { sessionId, files: backup.manifest.length });

  const changedRelative = [];
  let lastParsed = parsedError;

  const retryResult = await withRetry(async ({ attempt, maxAttempts }) => {
    appendPipelineLog('ai_fix_attempt', { attempt, files: affected.map((f) => path.relative(config.projectRoot, f)) });

    const fix = await runOpenAIFixPipeline({
      logs: readErrorLog(),
      parsedError: lastParsed,
      attempt,
      maxAttempts
    });

    applyFixFiles(fix.files);
    fix.files.forEach((f) => {
      if (!changedRelative.includes(f.path)) changedRelative.push(f.path);
    });

    appendPipelineLog('validation_start', { attempt });
    const validation = await validateFix();

    if (!validation.passed) {
      writeErrorLog(`${validation.stderr}\n${validation.stdout}`);
      lastParsed = parseErrorOutput(validation.stderr, validation.stdout);
      appendPipelineLog('validation_failed', { attempt });
      return { success: false, error: 'Tests or ESLint failed after fix', validation };
    }

    appendPipelineLog('validation_passed', { attempt });
    return {
      success: true,
      summary: fix.summary,
      validation,
      changedFiles: changedRelative
    };
  });

  if (retryResult.success) {
    try {
      const publish = await publishFix({
        summary: retryResult.summary || 'AI bug fix',
        changedFiles: retryResult.changedFiles || changedRelative
      });
      cleanupSession(sessionId);
      appendPipelineLog('pipeline_success', { prUrl: publish.prUrl });
      return { success: true, publish, attempt: retryResult.attempt };
    } catch (err) {
      await sendDiscordAlert({
        title: 'Autofix: GitHub publish failed',
        message: err.message,
        details: { sessionId, note: 'Local fixes kept on disk' }
      });
      appendPipelineLog('pipeline_github_error', { error: err.message });
      return {
        success: false,
        error: err.message,
        rolledBack: false,
        localFixApplied: true,
        changedFiles: retryResult.changedFiles || changedRelative
      };
    }
  }

  rollbackSession(sessionId);
  await sendDiscordAlert({
    title: 'Autofix failed',
    message: retryResult.error,
    details: { sessionId, attempts: config.MAX_AI_FIX_ATTEMPTS }
  });
  appendPipelineLog('pipeline_failed', { error: retryResult.error });
  return { success: false, rolledBack: true, error: retryResult.error };
}

async function main() {
  log.info('Starting autofix script');
  const testResult = await runTests();
  if (testResult.exitCode !== 0) {
    writeErrorLog(`${testResult.stderr}\n${testResult.stdout}`);
  }
  const result = await runAutofixPipeline({ testResult });
  if (!result.success && !result.skipped) {
    process.exitCode = 1;
  }
  log.info('Autofix finished', result);
}

if (require.main === module) {
  main().catch((err) => {
    log.error('Autofix crashed', { error: err.message, stack: err.stack });
    appendPipelineLog('pipeline_crash', { error: err.message });
    process.exitCode = 1;
  });
}

module.exports = { runAutofixPipeline, applyFixFiles };
