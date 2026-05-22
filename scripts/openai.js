/**
 * OpenAI bug-fix pipeline.
 *
 * 1. Read logs/error.log
 * 2. Parse stack trace → primary affected file
 * 3. Read file contents (allowlisted paths only)
 * 4. Send logs + code to OpenAI with fix prompt
 * 5. Return corrected code (code-only response)
 */
const path = require('path');
const config = require('../src/config');
const { createAIClient } = require('../src/openai/createClient');
const { parseErrorOutput } = require('../src/parser/errorParser');
const { readFileSafe, isPathAllowed } = require('../src/security/fileGuard');
const { createLogger, readErrorLog, appendPipelineLog } = require('./logger');

const log = createLogger('openai');

const FIX_PROMPT_TEMPLATE = `You are a senior software engineer.

Fix the bug in the provided code.

Rules:
- preserve functionality
- do not remove existing features
- follow ESLint rules
- avoid breaking changes
- use defensive programming

Error Logs:
{logs}

File Path:
{file}

Current Code:
{code}

Return ONLY corrected code.`;

function getClient() {
  return createAIClient();
}

function identifyAffectedFile(parsedError) {
  const candidates = (parsedError.affectedFiles || [])
    .map((f) => path.resolve(f))
    .filter((f) => isPathAllowed(f))
    .filter((f) => !f.includes(`${path.sep}__tests__${path.sep}`));

  if (candidates.length > 0) {
    return candidates[0];
  }

  const fallback = (parsedError.affectedFiles || []).find((f) => isPathAllowed(path.resolve(f)));
  if (fallback) return path.resolve(fallback);

  return path.join(config.sampleAppPath, 'utils', 'math.js');
}

function buildPrompt({ logs, filePath, code }) {
  const rel = path.relative(config.projectRoot, filePath).replace(/\\/g, '/');
  return FIX_PROMPT_TEMPLATE.replace('{logs}', logs)
    .replace('{file}', rel)
    .replace('{code}', code);
}

function extractCodeFromResponse(raw) {
  const trimmed = raw.trim();
  if (trimmed.startsWith('```')) {
    return trimmed.replace(/^```[\w]*\n?/, '').replace(/\n?```$/, '').trim();
  }
  return trimmed;
}

async function requestFixForFile({ filePath, logs, attempt, maxAttempts }) {
  const resolved = path.resolve(filePath);
  if (!isPathAllowed(resolved)) {
    throw new Error(`File not allowed for AI edit: ${resolved}`);
  }

  const code = readFileSafe(resolved);
  const prompt = buildPrompt({ logs, filePath: resolved, code });

  appendPipelineLog('openai_request', {
    attempt,
    maxAttempts,
    file: path.relative(config.projectRoot, resolved)
  });

  log.info('AI fix request', {
    attempt,
    file: path.relative(config.projectRoot, resolved),
    model: config.OPENAI_MODEL,
    baseURL: config.AI_BASE_URL || 'https://api.openai.com/v1'
  });

  const client = getClient();
  const completion = await client.chat.completions.create({
    model: config.OPENAI_MODEL,
    temperature: 0.1,
    messages: [
      {
        role: 'system',
        content:
          'Return only the full corrected source file. No markdown fences, no JSON, no explanation.'
      },
      { role: 'user', content: prompt }
    ]
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error('Empty OpenAI response');

  const fixedCode = extractCodeFromResponse(content);
  appendPipelineLog('openai_response', {
    attempt,
    file: path.relative(config.projectRoot, resolved),
    bytes: fixedCode.length
  });

  return {
    summary: `Fix ${path.basename(resolved)} (attempt ${attempt})`,
    files: [
      {
        path: path.relative(config.projectRoot, resolved).replace(/\\/g, '/'),
        content: fixedCode
      }
    ]
  };
}

function getSourceFilesToFix(parsedError) {
  const defaults = [
    path.join(config.sampleAppPath, 'utils', 'math.js'),
    path.join(config.sampleAppPath, 'services', 'userService.js'),
    path.join(config.sampleAppPath, 'services', 'apiClient.js')
  ];
  const fromStack = (parsedError.affectedFiles || [])
    .map((f) => path.resolve(f))
    .filter((f) => isPathAllowed(f) && !f.includes(`${path.sep}__tests__${path.sep}`));

  return [...new Set([...fromStack, ...defaults])].filter((f) => isPathAllowed(f));
}

async function runOpenAIFixPipeline(options = {}) {
  const errorLogs = options.logs ?? readErrorLog();
  const parsedError =
    options.parsedError ?? parseErrorOutput(errorLogs, options.stdout || '');

  if (options.filePath) {
    return requestFixForFile({
      filePath: path.resolve(options.filePath),
      logs: errorLogs,
      attempt: options.attempt ?? 1,
      maxAttempts: options.maxAttempts ?? config.MAX_AI_FIX_ATTEMPTS
    });
  }

  const filesToFix = getSourceFilesToFix(parsedError);
  const merged = { summary: '', files: [] };

  for (const filePath of filesToFix) {
    const fix = await requestFixForFile({
      filePath,
      logs: errorLogs,
      attempt: options.attempt ?? 1,
      maxAttempts: options.maxAttempts ?? config.MAX_AI_FIX_ATTEMPTS
    });
    merged.files.push(...fix.files);
    merged.summary = `Fixed ${merged.files.length} file(s)`;
  }

  return merged;
}

module.exports = {
  FIX_PROMPT_TEMPLATE,
  identifyAffectedFile,
  getSourceFilesToFix,
  buildPrompt,
  extractCodeFromResponse,
  requestFixForFile,
  runOpenAIFixPipeline
};
