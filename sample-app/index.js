/**
 * Sample Express app with intentional bugs for the autofix pipeline.
 * Runtime errors and failing tests are expected until AI applies fixes.
 */
const express = require('express');
const { getUserProfile } = require('./services/userService');
const { fetchExternalData } = require('./services/apiClient');
const { calculateDiscount } = require('./utils/math');
const { createLogger } = require('./lib/log');

const log = createLogger('sample-app');
const app = express();
const PORT = process.env.SAMPLE_PORT || 3099;

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.get('/user/:id', async (req, res) => {
  try {
    const profile = await getUserProfile(req.params.id);
    res.json(profile);
  } catch (err) {
    log.error('User route failed', { error: err.message, stack: err.stack });
    res.status(500).json({ error: err.message });
  }
});

app.get('/external', async (_req, res) => {
  try {
    const data = await fetchExternalData();
    res.json(data);
  } catch (err) {
    log.error('External API route failed', { error: err.message });
    res.status(502).json({ error: err.message });
  }
});

app.get('/discount/:price', (req, res) => {
  const price = Number(req.params.price);
  const result = calculateDiscount(price);
  res.json({ original: price, discounted: result });
});

if (require.main === module) {
  app.listen(PORT, () => {
    log.info(`Sample app listening on ${PORT}`);
  });
}

module.exports = app;
