const config = require('../config');
const { createLogger } = require('../logger');

const log = createLogger('discord');

async function sendDiscordAlert({ title, message, details }) {
  if (!config.DISCORD_WEBHOOK_URL) {
    log.warn('DISCORD_WEBHOOK_URL not set; skipping alert', { title });
    return { sent: false };
  }

  const body = {
    embeds: [
      {
        title,
        description: message,
        color: 0xff0000,
        fields: details
          ? Object.entries(details).map(([name, value]) => ({
              name,
              value: String(value).slice(0, 1000),
              inline: false
            }))
          : []
      }
    ]
  };

  const res = await fetch(config.DISCORD_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    throw new Error(`Discord webhook failed: ${res.status}`);
  }

  log.info('Discord alert sent', { title });
  return { sent: true };
}

module.exports = { sendDiscordAlert };
