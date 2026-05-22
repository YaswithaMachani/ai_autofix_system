const path = require('path');
const { z } = require('zod');
require('dotenv').config();

const envSchema = z.object({
  OPENAI_API_KEY: z.string().min(1).optional(),
  AI_BASE_URL: z.string().url().optional(),
  OPENAI_MODEL: z.string().default('gpt-4o-mini'),
  GITHUB_TOKEN: z.string().optional(),
  GITHUB_OWNER: z.string().optional(),
  GITHUB_REPO: z.string().optional(),
  GITHUB_BASE_BRANCH: z.string().default('main'),
  DISCORD_WEBHOOK_URL: z.string().optional(),
  MAX_AI_FIX_ATTEMPTS: z.coerce.number().int().min(1).max(10).default(3),
  SAMPLE_APP_PATH: z.string().default('sample-app'),
  ALLOWED_EDIT_PATHS: z.string().default('sample-app'),
  PROJECT_ROOT: z.string().default('.'),
  PORT: z.coerce.number().default(3847),
  API_SECRET: z.string().optional(),
  DOCKER_IMAGE: z.string().default('ai-autofix-sandbox'),
  LOG_LEVEL: z.string().default('info'),
  LOG_DIR: z.string().default('logs'),
  ERROR_LOG_FILE: z.string().default('logs/error.log'),
  PIPELINE_LOG_FILE: z.string().default('logs/pipeline.log'),
  N8N_WEBHOOK_URL: z.string().optional(),
  PROTECTED_BRANCHES: z.string().default('main,master')
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
  throw new Error(`Invalid environment configuration: ${issues}`);
}

const config = parsed.data;
const projectRoot = path.resolve(config.PROJECT_ROOT);

function normalizeRepoName(repo) {
  if (!repo) return repo;
  const match = repo.match(/github\.com[/:]([^/]+)\/([^/\s#?]+)/i);
  if (match) return match[2].replace(/\.git$/i, '');
  return repo.trim().replace(/\.git$/i, '');
}

const githubRepo = normalizeRepoName(config.GITHUB_REPO);

module.exports = {
  ...config,
  GITHUB_REPO: githubRepo,
  projectRoot,
  sampleAppPath: path.resolve(projectRoot, config.SAMPLE_APP_PATH),
  allowedEditPaths: config.ALLOWED_EDIT_PATHS.split(',').map((p) =>
    path.resolve(projectRoot, p.trim())
  ),
  logDir: path.resolve(projectRoot, config.LOG_DIR),
  errorLogPath: path.resolve(projectRoot, config.ERROR_LOG_FILE),
  pipelineLogPath: path.resolve(projectRoot, config.PIPELINE_LOG_FILE),
  protectedBranches: config.PROTECTED_BRANCHES.split(',').map((b) => b.trim())
};
