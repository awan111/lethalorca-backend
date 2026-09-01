const express = require('express');
const app = express();

app.use(express.json());

const botToken = process.env.BOT_TOKEN || "8689687590:AAHSzJ_36tERZZzo4LhSMIavF30lUZI18wE";
const mintAddress = "7RqpgT532tsYakbgnTXECC4MHTEGu5HzBxVAkAAHpump";
const targetChatId = "7586392121";

// 1. Root Route
app.get('/', (req, res) => {
  res.send('LethalOrca Backend is Live!');
});

// 2. Main Webhook Handler (Telegram & Helius Combined)
app.post('/api/webhook', async (req, res) => {
  try {
    const body = req.body;

    // --- CASE A: Telegram Bot Message ---
    if (body.message || body.callback_query) {
      const message = body.message;
      if (!message || !message.text) return res.status(200).json({ ok: true });

      const chatId = message.chat.id;
      const text = message.text.trim();
      let replyText = "";

      if (text === "/start" || text === "/help") {
        replyText = "🤖 LethalOrca ($LORCA) Bot Active!\n\nCommands:\n/price - Live Price & Market Cap\n/contract - Token Address\n/roadmap - Project Phases\n/socials - Links";
      } else if (text === "/price") {
        let liveDataFound = false;
        let priceUsd = "N/A";
        let marketCap = "N/A";
        let change24h = "0%";
        let sourceName = "";

        try {
          const dexRes = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mintAddress}`);
          const dexData = await dexRes.json();
          const pair = dexData.pairs?.[0];
          if (pair) {
            priceUsd = pair.priceUsd ? `$${pair.priceUsd}` : "N/A";
            const mcValue = pair.marketCap || pair.fdv;
            marketCap = mcValue ? Number(mcValue).toLocaleString('en-US', { style: 'currency', currency: 'USD' }) : "N/A";
            change24h = pair.priceChange?.h24 !== undefined ? `${pair.priceChange.h24}%` : "0%";
            sourceName = "DexScreener";
            liveDataFound = true;
          }
        } catch (e) {
          console.error("DexScreener error:", e);
        }

        if (!liveDataFound) {
          try {
            const pfRes = await fetch(`https://frontend-api.pump.fun/coins/${mintAddress}`, {
              headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json" }
            });
            const pfData = await pfRes.json();
            if (pfData && pfData.usd_market_cap) {
              const mc = pfData.usd_market_cap;
              const p = mc / 1000000000;
              priceUsd = p < 0.0001 ? `$${p.toExponential(4)}` : `$${p.toFixed(9)}`;
              marketCap = Number(mc).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
              sourceName = "Pump.fun";
              liveDataFound = true;
            }
          } catch (e) {
            console.error("Pump.fun error:", e);
          }
        }

        const pumpUrl = `https://pump.fun/coin/${mintAddress}`;
        const dexUrl = `https://dexscreener.com/solana/${mintAddress}`;

        if (liveDataFound) {
          replyText = `📊 $LORCA Stats (${sourceName}):\n\n💰 Price: ${priceUsd}\n📈 Market Cap: ${marketCap}\n🔄 24h Change: ${change24h}\n\n🔗 [DexScreener](${dexUrl}) | [Pump.fun](${pumpUrl})`;
        } else {
          replyText = `📊 $LORCA Live Stats:\n🔗 [Pump.fun](${pumpUrl})`;
        }
      } else if (text === "/contract") {
        replyText = `Contract: \`${mintAddress}\``;
      } else if (text === "/roadmap") {
        replyText = "🗺️ **Roadmap:** Phase 1 to Phase 4 in progress.";
      } else if (text === "/socials") {
        replyText = "🌐 Website: https://lethalorca.com/";
      } else {
        replyText = "Unknown command. Use /start";
      }

      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: replyText,
          parse_mode: "Markdown",
          disable_web_page_preview: true
        }),
      });

      return res.status(200).json({ ok: true });
    }

    // --- CASE B: Helius Webhook / Test Payload ---
    // Foran 200 OK bhej dein taake Helius test pass ho jaye
    res.status(200).json({ success: true, message: "Webhook received" });

    const transactions = Array.isArray(body) ? body : [body];
    for (const tx of transactions) {
      const signature = tx.signature;
      if (!signature) continue; // Skip agar signature na ho (jaise test ping mein)

      const txUrl = `https://solscan.io/tx/${signature}`;
      const dexUrl = `https://dexscreener.com/solana/${mintAddress}`;
      const pumpUrl = `https://pump.fun/coin/${mintAddress}`;

      const alertText = `🟢 **New Trade Alert!**\n\n🔗 [View TX](${txUrl}) | [DexScreener](${dexUrl}) | [Pump.fun](${pumpUrl})`;

      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: targetChatId,
          text: alertText,
          parse_mode: "Markdown",
          disable_web_page_preview: true
        })
      });
    }

  } catch (error) {
    console.error("Error:", error);
    if (!res.headersSent) {
      return res.status(200).json({ success: false });
    }
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = app;
