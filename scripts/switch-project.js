#!/usr/bin/env node
/**
 * switch-project.js
 * -----------------
 * Quickly switch the AI Autofix System to target a different project folder.
 * Supports any language: Node.js, Python, MERN, Go, Rust, Java, etc.
 *
 * Usage:
 *   node scripts/switch-project.js                          ← show current target
 *   node scripts/switch-project.js <path>                   ← switch (auto-detect language)
 *   node scripts/switch-project.js <path> python pytest     ← switch with custom test command
 *   node scripts/switch-project.js <path> node "npm test"   ← switch with explicit commands
 *
 * npm shortcut:
 *   npm run switch "C:\path\to\project"
 *   npm run switch "C:\path\to\project" python pytest
 */

const fs = require('fs');
const path = require('path');

const ENV_FILE = path.join(__dirname, '..', '.env');

// --- Auto-detect language based on files in the project ---
function detectLanguage(projectPath) {
  const checks = [
    { file: 'package.json',   language: 'node',    test: 'npm test',              lint: 'npm run lint' },
    { file: 'requirements.txt', language: 'python', test: 'pytest',               lint: 'flake8 .' },
    { file: 'setup.py',        language: 'python',  test: 'pytest',               lint: 'flake8 .' },
    { file: 'pyproject.toml',  language: 'python',  test: 'pytest',               lint: 'flake8 .' },
    { file: 'go.mod',          language: 'generic', test: 'go test ./...',         lint: 'go vet ./...' },
    { file: 'Cargo.toml',      language: 'generic', test: 'cargo test',            lint: 'cargo clippy' },
    { file: 'pom.xml',         language: 'generic', test: 'mvn test',              lint: 'none' },
    { file: 'build.gradle',    language: 'generic', test: 'gradle test',           lint: 'none' },
  ];

  for (const check of checks) {
    if (fs.existsSync(path.join(projectPath, check.file))) {
      return check;
    }
  }

  return { language: 'generic', test: 'npm test', lint: 'none' };
}

// --- Read current .env ---
if (!fs.existsSync(ENV_FILE)) {
  console.error('❌ .env file not found. Run: copy .env.example .env');
  process.exit(1);
}

let envContent = fs.readFileSync(ENV_FILE, 'utf8');

const newProjectPath = process.argv[2];
const langOverride    = process.argv[3]; // optional: python / node / generic
const testOverride    = process.argv[4]; // optional: pytest / npm test / etc.
const lintOverride    = process.argv[5]; // optional: flake8 / npm run lint / none

// --- Show current target if no arg given ---
if (!newProjectPath) {
  const rootMatch = envContent.match(/^PROJECT_ROOT=(.*)$/m);
  const langMatch = envContent.match(/^LANGUAGE=(.*)$/m);
  const testMatch = envContent.match(/^TEST_COMMAND=(.*)$/m);
  const lintMatch = envContent.match(/^LINT_COMMAND=(.*)$/m);

  console.log('\n📍 Current target project:');
  console.log(`   Path:     ${rootMatch ? rootMatch[1].trim() : 'not set'}`);
  console.log(`   Language: ${langMatch ? langMatch[1].trim() : 'not set'}`);
  console.log(`   Test:     ${testMatch ? testMatch[1].trim() : 'not set'}`);
  console.log(`   Lint:     ${lintMatch ? lintMatch[1].trim() : 'not set'}`);
  console.log('\n💡 To switch, run:');
  console.log('   npm run switch "C:\\path\\to\\project"');
  console.log('   npm run switch "C:\\path\\to\\project" python pytest "flake8 ."\n');
  process.exit(0);
}

// --- Normalize and validate path ---
const normalized = path.resolve(newProjectPath);

if (!fs.existsSync(normalized)) {
  console.error(`❌ Folder not found: ${normalized}`);
  process.exit(1);
}

// --- Auto-detect or use overrides ---
const detected = detectLanguage(normalized);
const language    = langOverride || detected.language;
const testCommand = testOverride || detected.test;
const lintCommand = lintOverride || detected.lint;

// --- Update the .env file ---
const updates = {
  SAMPLE_APP_PATH: normalized,
  ALLOWED_EDIT_PATHS: normalized,
  PROJECT_ROOT: normalized,
  LANGUAGE: language,
  TEST_COMMAND: testCommand,
  LINT_COMMAND: lintCommand,
};

let updated = envContent;
for (const [key, value] of Object.entries(updates)) {
  const regex = new RegExp(`^${key}=.*$`, 'm');
  const newLine = `${key}=${value}`;
  if (regex.test(updated)) {
    updated = updated.replace(regex, newLine);
  } else {
    updated += `\n${newLine}`;
  }
}

fs.writeFileSync(ENV_FILE, updated, 'utf8');

console.log('\n✅ Autofix system now targeting:');
console.log(`   📁 Path:     ${normalized}`);
console.log(`   🔤 Language: ${language}`);
console.log(`   🧪 Test:     ${testCommand}`);
console.log(`   🔍 Lint:     ${lintCommand}`);
console.log('\n🚀 You can now run:');
console.log('   npm run monitor   ← detect bugs');
console.log('   npm run autofix   ← AI fixes bugs\n');
