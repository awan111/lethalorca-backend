const express = require('express');

const app = express();
app.use(express.json({ limit: '16kb' }));

const mintAddress = '7RqpgT532tsYakbgnTXECC4MHTEGu5HzBxVAkAAHpump';
const botToken = process.env.TELEGRAM_BOT_TOKEN;
const targetChatId = process.env.TELEGRAM_CHAT_ID;

function telegramConfigured() {
  return Boolean(botToken && targetChatId);
}

async function sendTelegramMessage(chatId, text) {
  if (!telegramConfigured()) {
    throw new Error('Telegram environment variables are not configured');
  }

  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'Markdown',
      disable_web_page_preview: true
    })
  });

  if (!response.ok) {
    throw new Error(`Telegram API returned ${response.status}`);
  }

  return response.json();
}

app.get('/', (_req, res) => {
  res.send('LethalOrca Backend is Live!');
});

// Public website alerts. Credentials stay server-side in Vercel environment variables.
app.post('/api/telegram-alert', async (req, res) => {
  if (!telegramConfigured()) {
    return res.status(500).json({ success: false, error: 'Telegram is not configured' });
  }

  const wallet = typeof req.body?.wallet === 'string' ? req.body.wallet.trim() : '';
  const turnstileToken = typeof req.body?.turnstileToken === 'string' ? req.body.turnstileToken : '';

  if (wallet.length < 32 || wallet.length > 44) {
    return res.status(400).json({ success: false, error: 'Invalid wallet address' });
  }

  // Keep this hook ready for Turnstile verification when a server-side secret is configured.
  // The browser only sends the public site token; never trust it as a secret.
  if (!turnstileToken) {
    return res.status(400).json({ success: false, error: 'Captcha verification is required' });
  }

  try {
    await sendTelegramMessage(
      targetChatId,
      `💎 New Airdrop Submission!\n\nWallet: ${wallet}`
    );
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Telegram alert error:', error);
    return res.status(502).json({ success: false, error: 'Unable to send alert' });
  }
});

// Telegram bot and Helius webhook handler.
app.post('/api/webhook', async (req, res) => {
  if (!telegramConfigured()) {
    return res.status(500).json({ ok: false, error: 'Telegram is not configured' });
  }

  try {
    const body = req.body;

    if (body?.message?.text) {
      const message = body.message;
      const text = message.text.trim();
      let replyText = 'Unknown command. Use /start';

      if (text === '/start' || text === '/help') {
        replyText = '🤖 LethalOrca ($LORCA) Bot Active!\n\nCommands:\n/price - Live Price & Market Cap\n/contract - Token Address\n/roadmap - Project Phases\n/socials - Links';
      } else if (text === '/contract') {
        replyText = `Contract: \`${mintAddress}\``;
      } else if (text === '/roadmap') {
        replyText = '🗺️ **Roadmap:** Phase 1 to Phase 4 in progress.';
      } else if (text === '/socials') {
        replyText = '🌐 Website: https://lethalorca.com/';
      }

      await sendTelegramMessage(message.chat.id, replyText);
      return res.status(200).json({ ok: true });
    }

    const transactions = Array.isArray(body) ? body : [body];
    await Promise.all(transactions.filter((tx) => tx?.signature).map((tx) => {
      const txUrl = `https://solscan.io/tx/${tx.signature}`;
      const dexUrl = `https://dexscreener.com/solana/${mintAddress}`;
      const pumpUrl = `https://pump.fun/coin/${mintAddress}`;
      return sendTelegramMessage(
        targetChatId,
        `🟢 **New Trade Alert!**\n\n🔗 [View TX](${txUrl}) | [DexScreener](${dexUrl}) | [Pump.fun](${pumpUrl})`
      );
    }));

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(500).json({ success: false });
  }
});

const PORT = process.env.PORT || 3000;
if (require.main === module) {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;
