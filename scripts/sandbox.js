#!/usr/bin/env node
/**
 * npm run sandbox — isolated Docker execution (no host writes).
 */
require('dotenv').config();
const { spawn } = require('child_process');
const path = require('path');
const config = require('../src/config');
const { createLogger, appendPipelineLog } = require('./logger');

const log = createLogger('sandbox');

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd: config.projectRoot,
      shell: false,
      stdio: 'inherit'
    });
    child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}`))));
  });
}

async function main() {
  appendPipelineLog('sandbox_build', {});
  log.info('Building sandbox image');
  await run('docker', [
    'compose',
    '-f',
    path.join(config.projectRoot, 'docker-compose.yml'),
    'build',
    'sandbox'
  ]);

  appendPipelineLog('sandbox_run', {});
  log.info('Running isolated sandbox');
  await run('docker', [
    'compose',
    '-f',
    path.join(config.projectRoot, 'docker-compose.yml'),
    'run',
    '--rm',
    'sandbox'
  ]);

  log.info('Sandbox completed successfully');
}

main().catch((err) => {
  log.error('Sandbox failed', { error: err.message });
  appendPipelineLog('sandbox_failed', { error: err.message });
  process.exitCode = 1;
});
