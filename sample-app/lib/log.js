function createLogger(name) {
  return {
    info: (msg, meta) => console.log(`[${name}] INFO`, msg, meta || ''),
    error: (msg, meta) => console.error(`[${name}] ERROR`, msg, meta || '')
  };
}

module.exports = { createLogger };
