// api/spin/status.js
// Vercel Serverless Function — GET /api/spin/status?wallet=WALLET_ADDRESS
// Tells the frontend: can this wallet spin right now, how many seconds until it can,
// and what its current $LORCA balance is.

import { MongoClient } from "mongodb";

const MAX_SPINS_PER_DAY = 5;
const uri = process.env.MONGODB_URI; // same connection string your other endpoints already use
const dbName = process.env.MONGODB_DB || "lethalorca";

let cachedClient = null;
async function getDb() {
  if (cachedClient) return cachedClient.db(dbName);
  const client = new MongoClient(uri);
  await client.connect();
  cachedClient = client;
  return client.db(dbName);
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { wallet } = req.query;
  if (!wallet) {
    return res.status(400).json({ error: "wallet is required" });
  }

  try {
    const db = await getDb();
    const users = db.collection("users"); // change to your actual collection name if different

    const user = await users.findOne({ wallet });
    const now = new Date();
    const todayKey = now.toISOString().slice(0, 10); // e.g. "2026-08-08"

    const balance = user?.lorcaBalance ?? 0;
    const spinsDate = user?.spinsDate ?? null;
    const spinsToday = spinsDate === todayKey ? (user?.spinsToday ?? 0) : 0;

    const canSpin = spinsToday < MAX_SPINS_PER_DAY;

    // seconds left until midnight UTC reset (adjust to Asia/Karachi if you want local-day reset)
    const midnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
    const secondsLeft = canSpin ? 0 : Math.floor((midnight - now) / 1000);

    return res.status(200).json({
      canSpin,
      spinsUsed: spinsToday,
      spinsLeft: Math.max(0, MAX_SPINS_PER_DAY - spinsToday),
      secondsLeft,
      balance,
    });
  } catch (err) {
    console.error("spin/status error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
