/**
 * Logger — structured logs + dedicated error/pipeline files.
 *
 * Log flow:
 * 1. monitor/autofix writes failures → logs/error.log
 * 2. openai.js reads logs/error.log for AI context
 * 3. pipeline steps append to logs/pipeline.log (detailed audit)
 * 4. Winston continues daily rotate under logs/
 */
const fs = require('fs');
const path = require('path');
const config = require('../src/config');
const { createLogger: createWinstonLogger, ensureLogDir } = require('../src/logger');

const ERROR_LOG = config.errorLogPath;
const PIPELINE_LOG = config.pipelineLogPath;

function ensureLogFiles() {
  ensureLogDir();
  for (const file of [ERROR_LOG, PIPELINE_LOG]) {
    const dir = path.dirname(file);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(file)) fs.writeFileSync(file, '', 'utf8');
  }
}

function createLogger(moduleName) {
  return createWinstonLogger(moduleName);
}

function readErrorLog() {
  ensureLogFiles();
  if (!fs.existsSync(ERROR_LOG)) return '';
  return fs.readFileSync(ERROR_LOG, 'utf8');
}

function writeErrorLog(content) {
  ensureLogFiles();
  const header = `\n--- ${new Date().toISOString()} ---\n`;
  fs.appendFileSync(ERROR_LOG, header + content, 'utf8');
}

function clearErrorLog() {
  ensureLogFiles();
  fs.writeFileSync(ERROR_LOG, '', 'utf8');
}

function appendPipelineLog(step, details = {}) {
  ensureLogFiles();
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    step,
    ...details
  });
  fs.appendFileSync(PIPELINE_LOG, line + '\n', 'utf8');
}

module.exports = {
  createLogger,
  readErrorLog,
  writeErrorLog,
  clearErrorLog,
  appendPipelineLog,
  ERROR_LOG,
  PIPELINE_LOG
};
