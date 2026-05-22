#!/usr/bin/env node
/**
 * watch-and-fix.js
 * ----------------
 * Continuously watches a project folder for file changes.
 * When a change is detected, runs tests automatically.
 * If tests fail → triggers the full AI autofix pipeline.
 *
 * Usage:
 *   node scripts/watch-and-fix.js "C:\path\to\project"
 *   node scripts/watch-and-fix.js "C:\path\to\project" python pytest
 *
 * npm shortcut (add to package.json):
 *   npm run watch "C:\path\to\project"
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');

// ── Config ────────────────────────────────────────────────────────────────────
const AUTOFIX_ROOT = path.join(__dirname, '..');
const DEBOUNCE_MS  = 2000;   // wait 2s after last change before running tests
const WATCH_EXTS   = new Set(['.py', '.js', '.ts', '.go', '.rs', '.java', '.rb', '.php']);
const SKIP_DIRS    = new Set(['node_modules', '__pycache__', '.git', '.pytest_cache',
  'venv', '.venv', 'dist', 'build', 'coverage', 'logs', '.autofix-backups']);

// ── Args ──────────────────────────────────────────────────────────────────────
const targetProject = process.argv[2];
const langOverride  = process.argv[3];
const testOverride  = process.argv[4];

if (!targetProject) {
  console.error('\n❌ Usage: node scripts/watch-and-fix.js "C:\\path\\to\\project" [language] [test-command]');
  console.error('   Example: node scripts/watch-and-fix.js "C:\\myapp" python pytest\n');
  process.exit(1);
}

const normalized = path.resolve(targetProject);
if (!fs.existsSync(normalized)) {
  console.error(`❌ Folder not found: ${normalized}`);
  process.exit(1);
}

// ── Switch target project ─────────────────────────────────────────────────────
function switchTarget() {
  const args = [
    path.join(AUTOFIX_ROOT, 'scripts', 'switch-project.js'),
    normalized,
  ];
  if (langOverride) args.push(langOverride);
  if (testOverride) args.push(testOverride);
  execSync(`node ${args.map(a => `"${a}"`).join(' ')}`, { cwd: AUTOFIX_ROOT, stdio: 'inherit' });
}

// ── Run autofix pipeline ──────────────────────────────────────────────────────
function runAutofix() {
  return new Promise((resolve) => {
    console.log('\n🤖 Running AI Autofix Pipeline...\n');
    const child = spawn('node', [path.join(AUTOFIX_ROOT, 'scripts', 'autofix.js')], {
      cwd: AUTOFIX_ROOT,
      stdio: 'inherit',
      env: process.env
    });
    child.on('close', (code) => resolve(code === 0));
  });
}

// ── Watch for file changes ────────────────────────────────────────────────────
function watchDirectory(dir, onChange) {
  let debounceTimer = null;

  function watch(currentDir) {
    if (!fs.existsSync(currentDir)) return;
    fs.watch(currentDir, { recursive: false }, (event, filename) => {
      if (!filename) return;
      const ext = path.extname(filename);
      if (!WATCH_EXTS.has(ext)) return;
      if (filename.startsWith('.')) return;

      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        console.log(`\n📝 File changed: ${filename}`);
        onChange();
      }, DEBOUNCE_MS);
    });

    // Recurse into subdirectories
    try {
      for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
        if (entry.isDirectory() && !SKIP_DIRS.has(entry.name)) {
          watch(path.join(currentDir, entry.name));
        }
      }
    } catch (_) {}
  }

  watch(dir);
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n╔════════════════════════════════════════════════╗');
  console.log('║       🤖 AI Autofix — Watch Mode Active        ║');
  console.log('╚════════════════════════════════════════════════╝');
  console.log(`\n📁 Watching: ${normalized}`);
  console.log('⏳ Waiting for file changes... (Ctrl+C to stop)\n');

  switchTarget();

  let isRunning = false;

  watchDirectory(normalized, async () => {
    if (isRunning) {
      console.log('⏸️  Autofix already running, skipping...');
      return;
    }
    isRunning = true;
    console.log('🔍 Change detected → running tests...');
    const success = await runAutofix();
    if (success) {
      console.log('✅ All tests pass — no fix needed!\n');
    } else {
      console.log('⚠️  Autofix cycle complete. Check logs for details.\n');
    }
    isRunning = false;
    console.log('👁️  Watching for more changes...\n');
  });
}

main().catch((err) => {
  console.error('❌ Watcher crashed:', err.message);
  process.exit(1);
});
