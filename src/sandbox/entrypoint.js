/**
 * Docker entrypoint — runs sample-app tests inside the sandbox image.
 */
const { spawn } = require('child_process');

const child = spawn('npm', ['test', '--', '--runInBand', 'sample-app'], {
  cwd: '/app',
  shell: false,
  stdio: 'inherit'
});

child.on('close', (code) => process.exit(code ?? 1));
