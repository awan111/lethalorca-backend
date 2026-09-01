export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = req.body;
    const botToken = process.env.TELEGRAM_BOT_TOKEN;

    // 1. TELEGRAM BOT COMMANDS HANDLER
    if (body && body.message) {
      const chatId = body.message.chat.id;
      const text = body.message.text ? body.message.text.trim() : "";
      const tokenMint = "7RqpgT532tsYakbgnTXECC4MHTEGu5HzBxVAkAAHpump";

      let replyText = "";

      if (text.startsWith("/start") || text.startsWith("/help")) {
        replyText = `🤖 *LethalOrca ($LORCA) Bot Active!*\n\nAvailable commands:\n/price - Check live price & market cap\n/contract - Get official token contract\n/roadmap - View project phases\n/holders - Holder milestones progress\n/referral - Refer & earn reward info\n/build - Latest build-in-public updates\n/socials - Official links`;
      } 
      else if (text.startsWith("/contract")) {
        replyText = `📌 *Official Contract Address ($LORCA):*\n\`${tokenMint}\`\n\n*(Always verify on pump.fun!)*`;
      } 
      else if (text.startsWith("/roadmap")) {
        replyText = `🗺️ *LethalOrca Roadmap:*\n\n• *Phase 01:* Game Launch (LethalOrca Fishing)\n• *Phase 02:* Wallet Integration & Rewards\n• *Phase 03:* Marketplace & Community\n• *Phase 04:* In-Game Token Utility`;
      } 
      else if (text.startsWith("/holders")) {
        replyText = `🎯 *Holder Milestones & Targets:*\n\n• 100 Holders: 🔓 Unlocked!\n• 500 Holders: 🔄 In Progress...\n• 1,000 Holders: ⏳ Upcoming Community Celebration!\n\n_Keep pushing the community forward!_`;
      }
      else if (text.startsWith("/referral") || text.startsWith("/earn")) {
        replyText = `⚓ *Refer & Earn System:*\n\nConnect your wallet on [lethalorca.com](https://lethalorca.com/) to get your unique referral link. Bring friends and earn bonus $LORCA rewards together!`;
      }
      else if (text.startsWith("/build") || text.startsWith("/devlog")) {
        replyText = `🛠️ *LethalOrca Build Log (Build in Public):*\n\n• *JUL 2026:* $LORCA token live on pump.fun 🚀\n• *JUL 2026:* Backend withdrawal system deployed for Phase 2 ⚓\n• *JUL 2026:* Wallet-connect preview added to the game UI 🎮\n\n_An independent developer building in public, step by step!_`;
      }
      else if (text.startsWith("/socials")) {
        replyText = `🌐 *Official Links:*\n• Website: [lethalorca.com](https://lethalorca.com/)\n• Telegram: [Join Chat](https://t.me/lethalorca)\n• X / Twitter: [@lethalorcatdo](https://x.com/lethalorcatdo)`;
      } 
      else if (text.startsWith("/price")) {
        try {
          const pumpFunUrl = `https://pump.fun/coin/${tokenMint}`;
          
          const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${tokenMint}`, {
            headers: { "User-Agent": "Mozilla/5.0" }
          });
          const data = await response.json();
          const pair = data.pairs && data.pairs[0];

          if (pair) {
            const priceUsd = pair.priceUsd || "N/A";
            const mCap = pair.marketCap || pair.fdv || "N/A";
            const priceChange = pair.priceChange?.h24 || "0";
            
            replyText = `📊 *$LORCA Live Stats (DexScreener):*\n\n💰 *Price:* $${priceUsd}\n📈 *Market Cap:* $${Number(mCap).toLocaleString()}\n🔄 *24h Change:* ${priceChange}%\n🔗 [View on DexScreener](${pair.url})`;
          } else {
            const pumpRes = await fetch(`https://frontend-api.pump.fun/coins/${tokenMint}`, {
              headers: { "User-Agent": "Mozilla/5.0" }
            });
            
            if (pumpRes.ok) {
              const pumpData = await pumpRes.json();
              if (pumpData && pumpData.usd_market_cap) {
                const mCap = pumpData.usd_market_cap;
                const bondingProgress = pumpData.complete ? "Graduated to Raydium 🚀" : "Bonding Curve Active 🟢";
                
                replyText = `📊 *$LORCA Live Stats (Pump.fun):*\n\n📈 *Market Cap:* $${Number(mCap).toLocaleString()}\n⚡ *Status:* ${bondingProgress}\n🔗 [View on Pump.fun](${pumpFunUrl})`;
              } else {
                replyText = `📊 *$LORCA*: Token is live on pump.fun! Check real-time stats directly here:\n🔗 [Pump.fun Link](${pumpFunUrl})`;
              }
            } else {
              replyText = `📊 *$LORCA*: Token is live on pump.fun! Check real-time stats directly here:\n🔗 [Pump.fun Link](${pumpFunUrl})`;
            }
          }
        } catch (err) {
          const pumpFunUrl = `https://pump.fun/coin/${tokenMint}`;
          replyText = `📊 *$LORCA* is live on pump.fun! Check live stats here:\n🔗 [Pump.fun Link](${pumpFunUrl})`;
        }
      }

      if (replyText) {
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
      }

      return res.status(200).json({ success: true, message: "Telegram command handled" });
    }

    // 2. HELIUS WEBHOOK TRANSACTIONS HANDLER (Buy/Sell & Whale Alerts)
    const txs = body;
    if (!Array.isArray(txs) || txs.length === 0) {
      return res.status(200).json({ success: true, message: "No transactions found" });
    }

    const chatId = process.env.TELEGRAM_CHAT_ID;

    for (const tx of txs) {
      const description = tx.description || "New transaction detected!";
      const type = tx.type || "TRANSACTION";
      const signature = tx.signature || "";

      let solAmount = 0;
      if (tx.nativeTransfers && Array.isArray(tx.nativeTransfers)) {
        for (const nt of tx.nativeTransfers) {
          const sol = nt.amount / 1e9;
          if (sol > solAmount) solAmount = sol;
        }
      }

      const match = description.match(/([\d.]+)\s*SOL/i);
      if (match && match[1]) {
        const parsedSol = parseFloat(match[1]);
        if (parsedSol > solAmount) solAmount = parsedSol;
      }

      const isWhale = solAmount >= 1;

      let message = isWhale 
        ? `🐋 *WHALE ALERT! Massive Buy Detected!*\n\n` 
        : `🚨 *New Pump.fun / Solana Alert!*\n\n`;

      message += `📌 *Type:* ${type}\n`;
      if (solAmount > 0) {
        message += `💰 *SOL Amount:* ${solAmount.toFixed(2)} SOL\n`;
      }
      message += `📝 *Details:* ${description}\n`;
      if (signature) {
        message += `🔗 [View on Solscan](https://solscan.io/tx/${signature})`;
      }

      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: "Markdown"
        }),
      });
    }

    return res.status(200).json({ success: true, message: "Transactions sent to Telegram" });
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
