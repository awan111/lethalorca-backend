// api/spin/play.js
// Vercel Serverless Function — POST /api/spin/play  body: { wallet: "WALLET_ADDRESS" }
// This is where the ACTUAL random result is decided. Never trust the browser for this —
// always compute the win amount here on the server.

import { MongoClient } from "mongodb";

const MAX_SPINS_PER_DAY = 5;
const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "lethalorca";

// Must match the SEGMENTS array in your frontend wheel exactly (label -> amount -> weight)
const SEGMENTS = [
  { amount: 0,    weight: 30 },
  { amount: 10,   weight: 25 },
  { amount: 20,   weight: 18 },
  { amount: 50,   weight: 12 },
  { amount: 100,  weight: 8  },
  { amount: 250,  weight: 4  },
  { amount: 500,  weight: 2  },
  { amount: 1000, weight: 1  },
];

let cachedClient = null;
async function getDb() {
  if (cachedClient) return cachedClient.db(dbName);
  const client = new MongoClient(uri);
  await client.connect();
  cachedClient = client;
  return client.db(dbName);
}

function weightedPick() {
  const total = SEGMENTS.reduce((s, x) => s + x.weight, 0);
  let r = Math.random() * total;
  for (const seg of SEGMENTS) {
    r -= seg.weight;
    if (r <= 0) return seg;
  }
  return SEGMENTS[0];
}

export default async function handler(req, res) {
  // CORS Headers to allow requests from frontend
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { wallet } = req.body || {};
  if (!wallet) {
    return res.status(400).json({ error: "wallet is required" });
  }

  try {
    const db = await getDb();
    const users = db.collection("users");

    const now = new Date();
    const todayKey = now.toISOString().slice(0, 10);

    let user = await users.findOne({ wallet });
    if (!user) {
      // create the wallet's record on first-ever visit
      await users.insertOne({ wallet, lorcaBalance: 0, spinsToday: 0, spinsDate: todayKey });
      user = { wallet, lorcaBalance: 0, spinsToday: 0, spinsDate: todayKey };
    }

    const spinsToday = user.spinsDate === todayKey ? (user.spinsToday || 0) : 0;

    if (spinsToday >= MAX_SPINS_PER_DAY) {
      return res.status(429).json({ error: "Daily spin limit reached" });
    }

    // ---- server decides the result, not the browser ----
    const result = weightedPick();
    const newBalance = (user.lorcaBalance || 0) + result.amount;
    const newSpinsToday = spinsToday + 1;

    await users.updateOne(
      { wallet },
      {
        $set: {
          lorcaBalance: newBalance,
          spinsToday: newSpinsToday,
          spinsDate: todayKey,
          lastSpinAt: now,
        },
      }
    );

    const midnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
    const secondsLeft = newSpinsToday >= MAX_SPINS_PER_DAY
      ? Math.floor((midnight - now) / 1000)
      : 0;

    return res.status(200).json({
      amount: result.amount,
      balance: newBalance,
      spinsLeft: Math.max(0, MAX_SPINS_PER_DAY - newSpinsToday),
      secondsLeft,
    });
  } catch (err) {
    console.error("spin/play error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
