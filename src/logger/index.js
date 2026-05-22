/**
 * Logger system — central structured logging for the autofix pipeline.
 *
 * Log flow:
 * 1. sample-app / monitor child processes write to stdout/stderr
 * 2. monitor captures streams → logger.info/error with raw + parsed metadata
 * 3. errorParser reads recent log files + captured buffers on failure
 * 4. autofix runner attaches log excerpts to OpenAI prompt context
 * 5. daily rotate files under LOG_DIR persist audit trail for n8n/GitHub triggers
 */
const fs = require('fs');
const path = require('path');
const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const config = require('../config');

let baseLogger = null;

function ensureLogDir() {
  if (!fs.existsSync(config.logDir)) {
    fs.mkdirSync(config.logDir, { recursive: true });
  }
}

function getBaseLogger() {
  if (baseLogger) return baseLogger;
  ensureLogDir();

  const transports = [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message, module, ...meta }) => {
          const extra = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
          return `${timestamp} [${level}]${module ? ` (${module})` : ''}: ${message}${extra}`;
        })
      )
    }),
    new DailyRotateFile({
      dirname: config.logDir,
      filename: 'autofix-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxFiles: '14d',
      format: winston.format.json()
    })
  ];

  baseLogger = winston.createLogger({
    level: config.LOG_LEVEL,
    defaultMeta: { service: 'ai-autofix' },
    transports
  });

  return baseLogger;
}

function createLogger(moduleName) {
  const logger = getBaseLogger();
  return {
    debug: (msg, meta = {}) => logger.debug(msg, { module: moduleName, ...meta }),
    info: (msg, meta = {}) => logger.info(msg, { module: moduleName, ...meta }),
    warn: (msg, meta = {}) => logger.warn(msg, { module: moduleName, ...meta }),
    error: (msg, meta = {}) => logger.error(msg, { module: moduleName, ...meta })
  };
}

function readRecentLogs(maxLines = 200) {
  ensureLogDir();
  const files = fs
    .readdirSync(config.logDir)
    .filter((f) => f.startsWith('autofix-') && f.endsWith('.log'))
    .map((f) => ({ name: f, mtime: fs.statSync(path.join(config.logDir, f)).mtime }))
    .sort((a, b) => b.mtime - a.mtime);

  if (files.length === 0) return '';

  const content = fs.readFileSync(path.join(config.logDir, files[0].name), 'utf8');
  const lines = content.trim().split('\n');
  return lines.slice(-maxLines).join('\n');
}

module.exports = { createLogger, readRecentLogs, ensureLogDir };
