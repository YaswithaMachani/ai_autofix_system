/**
 * Docker sandbox execution — runs tests in isolated container without network.
 */
const { spawn } = require('child_process');
const path = require('path');
const config = require('../config');
const { createLogger } = require('../logger');

const log = createLogger('sandbox');

function runDockerSandbox() {
  const projectRoot = config.projectRoot;
  const image = config.DOCKER_IMAGE;

  const args = [
    'run',
    '--rm',
    '--network',
    'none',
    '-v',
    `${path.join(projectRoot, 'sample-app')}:/app/sample-app:ro`,
    '-v',
    `${path.join(projectRoot, 'tests')}:/app/tests:ro`,
    image
  ];

  return new Promise((resolve) => {
    log.info('Starting Docker sandbox', { image });
    const child = spawn('docker', args, { cwd: projectRoot, shell: false });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => { stdout += d.toString(); });
    child.stderr.on('data', (d) => { stderr += d.toString(); });
    child.on('close', (code) => {
      resolve({ exitCode: code ?? 1, stdout, stderr });
    });
  });
}

async function ensureImageBuilt() {
  return new Promise((resolve, reject) => {
    const child = spawn(
      'docker',
      ['build', '-t', config.DOCKER_IMAGE, '.'],
      { cwd: config.projectRoot, shell: false }
    );
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error('Docker build failed'));
    });
  });
}

module.exports = { runDockerSandbox, ensureImageBuilt };
