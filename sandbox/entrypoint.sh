#!/bin/sh
set -eu

# Isolated workspace — repo mounted read-only at /repo; no host writes.
echo "[sandbox] Copying repository to ephemeral /workspace"
rm -rf /workspace/project
mkdir -p /workspace/project
cp -a /repo/. /workspace/project/

cd /workspace/project

echo "[sandbox] npm install"
npm ci 2>/dev/null || npm install

echo "[sandbox] npm test"
npm test -- --runInBand sample-app

echo "[sandbox] npm run lint"
npm run lint

echo "[sandbox] All checks passed"
