#!/usr/bin/env node
/**
 * autofix-cli.js — Global CLI entry point
 * ----------------------------------------
 * After running `npm link` in the autofix project, this becomes
 * a global `autofix` command available from ANY folder/terminal.
 *
 * Usage (from ANY project folder):
 *   autofix                  ← detect + fix bugs in current folder
 *   autofix watch            ← watch current folder for changes
 *   autofix status           ← show what project is currently targeted
 *   autofix fix              ← run AI fix pipeline
 *   autofix monitor          ← run tests only (no AI fix)
 *
 * Examples:
 *   cd C:\Users\yaswitha\Downloads\my-python-app
 *   autofix                  ← AI fixes bugs in this folder!
 */

const path = require('path');
const fs   = require('fs');
const { execSync, spawn } = require('child_process');

// The root of the autofix system (where this file lives)
const AUTOFIX_ROOT = path.join(__dirname, '..');

// Current working directory = the project the user has open
const CWD = process.cwd();

const command = process.argv[2] || 'fix';

// ── Helpers ───────────────────────────────────────────────────────────────────
function run(scriptName, extraArgs = []) {
  const scriptPath = path.join(AUTOFIX_ROOT, 'scripts', scriptName);
  const args = [scriptPath, ...extraArgs];
  const child = spawn('node', args, {
    cwd: AUTOFIX_ROOT,
    stdio: 'inherit',
    env: { ...process.env }
  });
  child.on('close', (code) => process.exitCode = code || 0);
}

function switchToCurrentDir() {
  const switchScript = path.join(AUTOFIX_ROOT, 'scripts', 'switch-project.js');
  try {
    execSync(`node "${switchScript}" "${CWD}"`, {
      cwd: AUTOFIX_ROOT,
      stdio: 'inherit'
    });
  } catch (e) {
    process.exit(1);
  }
}

function printHelp() {
  console.log(`
╔══════════════════════════════════════════════════╗
║         🤖 AI Autofix — Global CLI Tool          ║
╚══════════════════════════════════════════════════╝

Usage:  autofix [command]

Commands:
  autofix              Run full AI fix pipeline on current folder (default)
  autofix fix          Same as above
  autofix monitor      Run tests only, write errors to log
  autofix watch        Watch for file changes and auto-fix
  autofix status       Show which project is currently targeted
  autofix help         Show this help message

Examples:
  cd C:\\Users\\yaswitha\\my-python-app && autofix
  cd C:\\Users\\yaswitha\\my-mern-app  && autofix watch
  autofix status
`);
}

// ── Commands ──────────────────────────────────────────────────────────────────
switch (command) {
  case 'help':
  case '--help':
  case '-h':
    printHelp();
    break;

  case 'status':
    run('switch-project.js');
    break;

  case 'monitor':
    console.log(`\n🔍 Switching target to: ${CWD}`);
    switchToCurrentDir();
    run('monitor.js');
    break;

  case 'watch':
    run('watch-and-fix.js', [CWD]);
    break;

  case 'fix':
  default:
    console.log(`\n🤖 AI Autofix targeting: ${CWD}\n`);
    switchToCurrentDir();
    run('autofix.js');
    break;
}
