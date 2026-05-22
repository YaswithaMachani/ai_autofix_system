/**
 * GitHub automation — NEVER commits to production branches (main/master).
 * Always uses autofix/* feature branches and opens PRs into base branch.
 */
const simpleGit = require('simple-git');
const config = require('../src/config');
const { publishFix: publishFixCore } = require('../src/github/automation');
const { createLogger, appendPipelineLog } = require('./logger');

const log = createLogger('github');

function assertSafeBranch(branchName) {
  const normalized = branchName.toLowerCase();
  for (const protectedBranch of config.protectedBranches) {
    if (normalized === protectedBranch.toLowerCase()) {
      throw new Error(
        `Refusing to modify protected production branch: ${branchName}`
      );
    }
  }
  if (!branchName.startsWith('autofix/')) {
    throw new Error(`Branch must start with autofix/: got ${branchName}`);
  }
}

async function assertNotOnProtectedBranch() {
  const git = simpleGit(config.projectRoot);
  const status = await git.status();
  const current = status.current || '';
  const protectedSet = config.protectedBranches.map((b) => b.toLowerCase());
  if (protectedSet.includes(current.toLowerCase())) {
    throw new Error(
      `Refusing to run GitHub publish while on protected branch: ${current}`
    );
  }
}

async function publishFix({ summary, changedFiles }) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const branchName = `autofix/ai-${timestamp}`;
  assertSafeBranch(branchName);

  appendPipelineLog('github_publish_start', { branchName, files: changedFiles });

  const result = await publishFixCore({ summary, changedFiles });

  appendPipelineLog('github_publish_done', {
    branchName: result.branchName,
    prUrl: result.prUrl
  });

  log.info('Published autofix PR', { branch: result.branchName, pr: result.prUrl });
  return result;
}

async function pullRepository() {
  const git = simpleGit(config.projectRoot);
  appendPipelineLog('github_pull', {});
  await git.fetch('origin', config.GITHUB_BASE_BRANCH);
  log.info('Fetched latest base branch', { base: config.GITHUB_BASE_BRANCH });
  return { base: config.GITHUB_BASE_BRANCH };
}

module.exports = {
  assertSafeBranch,
  assertNotOnProtectedBranch,
  publishFix,
  pullRepository
};
