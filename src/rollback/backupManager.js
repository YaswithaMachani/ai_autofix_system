/**
 * Rollback — before AI overwrites files, snapshots are stored under .autofix-backups/.
 * If validation fails after all retries, restore copies the originals back.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const config = require('../config');
const { createLogger } = require('../logger');

const log = createLogger('rollback');
const BACKUP_ROOT = path.join(config.projectRoot, '.autofix-backups');

function createSessionId() {
  return crypto.randomBytes(8).toString('hex');
}

function backupFiles(filePaths, sessionId) {
  const sessionDir = path.join(BACKUP_ROOT, sessionId);
  fs.mkdirSync(sessionDir, { recursive: true });
  const manifest = [];

  for (const filePath of filePaths) {
    const resolved = path.resolve(filePath);
    if (!fs.existsSync(resolved)) continue;
    const rel = path.relative(config.projectRoot, resolved);
    const dest = path.join(sessionDir, rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(resolved, dest);
    manifest.push({ original: resolved, backup: dest });
  }

  fs.writeFileSync(
    path.join(sessionDir, 'manifest.json'),
    JSON.stringify(manifest, null, 2)
  );

  log.info('Backup created', { sessionId, files: manifest.length });
  return { sessionId, sessionDir, manifest };
}

function rollbackSession(sessionId) {
  const sessionDir = path.join(BACKUP_ROOT, sessionId);
  const manifestPath = path.join(sessionDir, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`No backup manifest for session ${sessionId}`);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  for (const entry of manifest) {
    fs.copyFileSync(entry.backup, entry.original);
  }

  log.warn('Rolled back files from backup', { sessionId, count: manifest.length });
  return manifest;
}

function cleanupSession(sessionId) {
  const sessionDir = path.join(BACKUP_ROOT, sessionId);
  if (fs.existsSync(sessionDir)) {
    fs.rmSync(sessionDir, { recursive: true, force: true });
  }
}

module.exports = { createSessionId, backupFiles, rollbackSession, cleanupSession };
