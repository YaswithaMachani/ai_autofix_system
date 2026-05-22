/**
 * OpenAI prompt manager — builds structured prompts with logs + source context.
 *
 * AI context flow:
 * 1. errorParser supplies error type, message, stack frames
 * 2. fileGuard reads allowed affected files only
 * 3. readRecentLogs adds runtime/monitor history
 * 4. prompt requests JSON array of { path, content } patches
 * 5. response validated before writeFileSafe applies each file
 */
const path = require('path');
const { readFileSafe } = require('../security/fileGuard');
const { isPathAllowed } = require('../security/fileGuard');

function buildFixPrompt({ parsedError, logExcerpt, attempt, maxAttempts }) {
  const fileContexts = loadFileContexts(parsedError.affectedFiles);

  const system = `You are a senior Node.js engineer fixing production bugs.
Respond ONLY with valid JSON (no markdown fences):
{
  "summary": "short description of fixes",
  "files": [
    { "path": "relative/path/from/project/root", "content": "full file content after fix" }
  ]
}
Rules:
- Fix root cause, use defensive coding (null checks, await, HTTP status checks).
- Return COMPLETE file contents for each changed file.
- Only modify files necessary to fix the errors and failing tests.
- Do not add explanations outside JSON.`;

  const user = {
    attempt: `${attempt}/${maxAttempts}`,
    error: {
      type: parsedError.type,
      message: parsedError.message,
      frames: parsedError.frames.slice(0, 15)
    },
    logs: logExcerpt,
    files: fileContexts,
    instruction:
      'Analyze the error and logs, fix undefined variables, async/await issues, and API error handling.'
  };

  return { system, user: JSON.stringify(user, null, 2) };
}

function loadFileContexts(filePaths) {
  const contexts = [];
  for (const filePath of filePaths) {
    const resolved = path.resolve(filePath);
    if (!isPathAllowed(resolved)) continue;
    try {
      contexts.push({
        path: path.relative(process.cwd(), resolved).replace(/\\/g, '/'),
        content: readFileSafe(resolved)
      });
    } catch {
      // skip unreadable
    }
  }
  return contexts;
}

function parseFixResponse(rawContent) {
  const trimmed = rawContent.trim();
  const jsonText = trimmed.startsWith('```')
    ? trimmed.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
    : trimmed;

  const parsed = JSON.parse(jsonText);
  if (!parsed.files || !Array.isArray(parsed.files)) {
    throw new Error('AI response missing files array');
  }

  return {
    summary: parsed.summary || 'AI fix',
    files: parsed.files.map((f) => ({
      path: f.path,
      content: f.content
    }))
  };
}

module.exports = { buildFixPrompt, parseFixResponse };
