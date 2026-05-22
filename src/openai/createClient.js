const OpenAI = require('openai');
const config = require('../config');

const DEFAULT_BASE_URL = 'https://api.openai.com/v1';

/**
 * OpenAI-compatible client (OpenAI, Groq, etc.) via AI_BASE_URL.
 */
function createAIClient() {
  if (!config.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is required');
  }

  return new OpenAI({
    apiKey: config.OPENAI_API_KEY,
    baseURL: config.AI_BASE_URL || DEFAULT_BASE_URL
  });
}

module.exports = { createAIClient, DEFAULT_BASE_URL };
