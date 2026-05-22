#!/usr/bin/env node
/**
 * npm run monitor — run tests, capture failures → logs/error.log
 */
require('dotenv').config();
const { runTests } = require('../src/validator/testRunner');
const { parseErrorOutput, detectFailure } = require('../src/parser/errorParser');
const { runSampleApp } = require('../src/monitor/processMonitor');
const { createLogger, writeErrorLog, appendPipelineLog } = require('./logger');

const log = createLogger('monitor');

async function main() {
  appendPipelineLog('monitor_start', {});
  log.info('Monitor cycle started');

  const testResult = await runTests();
  const runtimeResult = await runSampleApp({ timeoutMs: 5000 });

  const failed =
    detectFailure({
      exitCode: testResult.exitCode,
      stderr: testResult.stderr,
      stdout: testResult.stdout,
      testFailed: testResult.exitCode !== 0
    }) || runtimeResult.failed;

  if (failed) {
    const combined = `${testResult.stderr}\n${testResult.stdout}\n${runtimeResult.stderr}`;
    writeErrorLog(combined);
    const parsed = parseErrorOutput(combined, '');
    appendPipelineLog('monitor_failure', {
      errorType: parsed.type,
      affectedFiles: parsed.affectedFiles
    });
    log.error('Failure detected', { message: parsed.message });
    process.exitCode = 1;
  } else {
    appendPipelineLog('monitor_ok', {});
    log.info('Monitor cycle passed');
  }
}

main().catch((err) => {
  log.error('Monitor crashed', { error: err.message });
  process.exitCode = 1;
});
