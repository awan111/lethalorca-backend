const ALLOWED_ORIGINS = new Set([
  'https://lethalorca.com',
  'https://www.lethalorca.com',
  'http://localhost:3000',
  'http://localhost:5500'
]);

function setCors(req, res) {
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function json(res, status, body) {
  res.status(status).setHeader('Content-Type', 'application/json').send(JSON.stringify(body));
}

module.exports = async function handler(req, res) {
  setCors(req, res);

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return json(res, 405, { success: false, error: 'Method not allowed' });

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!botToken || !chatId) {
    console.error('Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID');
    return json(res, 500, { success: false, error: 'Telegram is not configured' });
  }

  const wallet = typeof req.body?.wallet === 'string' ? req.body.wallet.trim() : '';
  const turnstileToken = typeof req.body?.turnstileToken === 'string' ? req.body.turnstileToken : '';
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(wallet)) {
    return json(res, 400, { success: false, error: 'Invalid wallet address' });
  }
  if (!turnstileToken) {
    return json(res, 400, { success: false, error: 'Captcha verification is required' });
  }

  try {
    const telegramResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: `💎 New Airdrop Submission!\n\nWallet: ${wallet}`,
        disable_web_page_preview: true
      })
    });

    if (!telegramResponse.ok) {
      console.error('Telegram API returned', telegramResponse.status);
      return json(res, 502, { success: false, error: 'Unable to send alert' });
    }

    return json(res, 200, { success: true });
  } catch (error) {
    console.error('Telegram alert error:', error);
    return json(res, 502, { success: false, error: 'Unable to send alert' });
  }
};
