#!/usr/bin/env node
/**
 * install-git-hook.js
 * --------------------
 * Installs a git pre-push hook into ANY project folder.
 * After install: every time you `git push`, tests run automatically.
 * If tests fail → AI Autofix runs → if fixed, push continues.
 *
 * Usage:
 *   node scripts/install-git-hook.js "C:\path\to\your\project"
 *
 * To uninstall:
 *   node scripts/install-git-hook.js "C:\path\to\your\project" --uninstall
 */

const fs   = require('fs');
const path = require('path');

const AUTOFIX_ROOT  = path.join(__dirname, '..');
const targetProject = process.argv[2];
const uninstall     = process.argv.includes('--uninstall');

if (!targetProject) {
  console.error('\n❌ Usage: node scripts/install-git-hook.js "C:\\path\\to\\project"');
  process.exit(1);
}

const normalized = path.resolve(targetProject);
const gitDir     = path.join(normalized, '.git');
const hooksDir   = path.join(gitDir, 'hooks');
const hookFile   = path.join(hooksDir, 'pre-push');

if (!fs.existsSync(gitDir)) {
  console.error(`❌ Not a git repository: ${normalized}`);
  console.error('   Run: git init   in your project first.');
  process.exit(1);
}

// ── Uninstall ─────────────────────────────────────────────────────────────────
if (uninstall) {
  if (fs.existsSync(hookFile)) {
    fs.unlinkSync(hookFile);
    console.log(`✅ Git hook removed from: ${normalized}`);
  } else {
    console.log('ℹ️  No hook found to remove.');
  }
  process.exit(0);
}

// ── Install ───────────────────────────────────────────────────────────────────
if (!fs.existsSync(hooksDir)) fs.mkdirSync(hooksDir, { recursive: true });

// Detect language for the hook script
function detectLang(dir) {
  if (fs.existsSync(path.join(dir, 'requirements.txt')) ||
      fs.existsSync(path.join(dir, 'pyproject.toml'))) return { lang: 'python', test: 'pytest', lint: 'none' };
  if (fs.existsSync(path.join(dir, 'go.mod')))   return { lang: 'generic', test: 'go test ./...', lint: 'none' };
  if (fs.existsSync(path.join(dir, 'Cargo.toml'))) return { lang: 'generic', test: 'cargo test', lint: 'none' };
  if (fs.existsSync(path.join(dir, 'pom.xml')))  return { lang: 'generic', test: 'mvn test', lint: 'none' };
  return { lang: 'node', test: 'npm test', lint: 'npm run lint' };
}

const { lang, test: testCmd, lint: lintCmd } = detectLang(normalized);

const hookContent = `#!/bin/sh
# AI Autofix pre-push hook — installed by ai-autofix-system
# Runs tests before push. If tests fail, AI tries to fix them.

AUTOFIX_ROOT="${AUTOFIX_ROOT.replace(/\\/g, '/')}"
PROJECT_PATH="${normalized.replace(/\\/g, '/')}"
LANGUAGE="${lang}"
TEST_CMD="${testCmd}"
LINT_CMD="${lintCmd}"

echo ""
echo "🔍 [AI Autofix] Running tests before push..."
echo "   Project: $PROJECT_PATH"
echo "   Test:    $TEST_CMD"
echo ""

# Switch autofix target to this project
node "$AUTOFIX_ROOT/scripts/switch-project.js" "$PROJECT_PATH" "$LANGUAGE" "$TEST_CMD" "$LINT_CMD"

# Run tests via autofix monitor
node "$AUTOFIX_ROOT/scripts/autofix.js"
EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
  echo ""
  echo "✅ Tests passed. Proceeding with push."
  echo ""
  exit 0
else
  echo ""
  echo "⚠️  AI attempted a fix but could not fully resolve all issues."
  echo "   Check logs/ for details. Push blocked."
  echo ""
  exit 1
fi
`;

fs.writeFileSync(hookFile, hookContent, { mode: 0o755 });

console.log('\n✅ Git pre-push hook installed!');
console.log(`   📁 Project:  ${normalized}`);
console.log(`   🔤 Language: ${lang}`);
console.log(`   🧪 Test cmd: ${testCmd}`);
console.log('\n📌 How it works:');
console.log('   Every time you run  git push  in your project:');
console.log('   1. Tests run automatically');
console.log('   2. If tests fail → AI tries to fix the code');
console.log('   3. If AI fixes it → push proceeds');
console.log('   4. If AI cannot fix → push is blocked + Discord alert');
console.log('\n🗑️  To uninstall:');
console.log(`   node scripts/install-git-hook.js "${normalized}" --uninstall\n`);
