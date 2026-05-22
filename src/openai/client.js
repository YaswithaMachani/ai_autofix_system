const config = require('../config');
const { createLogger } = require('../logger');
const { buildFixPrompt, parseFixResponse } = require('./promptManager');
const { createAIClient } = require('./createClient');

const log = createLogger('openai');

function getClient() {
  return createAIClient();
}

async function requestFix(context) {
  const client = getClient();
  const { system, user } = buildFixPrompt(context);

  log.info('Sending fix request to AI', {
    attempt: context.attempt,
    model: config.OPENAI_MODEL,
    baseURL: config.AI_BASE_URL || 'https://api.openai.com/v1',
    files: context.parsedError.affectedFiles
  });

  const completion = await client.chat.completions.create({
    model: config.OPENAI_MODEL,
    temperature: 0.2,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user }
    ]
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error('Empty OpenAI response');
  }

  return parseFixResponse(content);
}

module.exports = { requestFix };
