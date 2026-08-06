import { MongoClient } from 'mongodb';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Content-Type'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) {
    return res.status(500).json({ success: false, error: 'Database URI environment variable is missing' });
  }

  let client;
  try {
    client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
    await client.connect();
    const db = client.db('lethalorca');
    const users = db.collection('users');

    const { action } = req.query;

    // ---- 1. Get (or create) referral code for a wallet ----
    if (req.method === 'GET' && action === 'get-code') {
      const { wallet } = req.query;
      if (!wallet) return res.status(400).json({ success: false, error: 'Wallet address required' });

      let user = await users.findOne({ wallet });

      if (!user) {
        // Pehli dafa is wallet ka record bante hue referral code bhi generate karo
        const code = generateReferralCode(wallet);
        const newUser = {
          wallet,
          balance: 0,
          referralCode: code,
          referredBy: null,
          referralCount: 0,
          referralEarnings: 0,
          createdAt: new Date()
        };
        await users.insertOne(newUser);
        user = newUser;
      } else if (!user.referralCode) {
        const code = generateReferralCode(wallet);
        await users.updateOne({ wallet }, { $set: { referralCode: code } });
        user.referralCode = code;
      }

      return res.status(200).json({
        success: true,
        referralCode: user.referralCode,
        referralCount: user.referralCount || 0,
        referralEarnings: user.referralEarnings || 0
      });
    }

    // ---- 2. Apply a referral code ----
    if (req.method === 'POST' && action === 'apply-code') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
      const { wallet, code } = body;

      if (!wallet || !code) {
        return res.status(400).json({ success: false, error: 'Wallet and code are required' });
      }

      let newUser = await users.findOne({ wallet });
      if (!newUser) {
        newUser = {
          wallet,
          balance: 0,
          referralCode: generateReferralCode(wallet),
          referredBy: null,
          referralCount: 0,
          referralEarnings: 0,
          createdAt: new Date()
        };
        await users.insertOne(newUser);
      }

      if (newUser.referredBy) {
        return res.status(400).json({ success: false, error: 'Referral code already applied to this wallet' });
      }

      const referrer = await users.findOne({ referralCode: code });
      if (!referrer) {
        return res.status(400).json({ success: false, error: 'Invalid referral code' });
      }
      if (referrer.wallet === wallet) {
        return res.status(400).json({ success: false, error: 'You cannot use your own referral code' });
      }

      const REFERRAL_BONUS = 50; // LORCA — chahein to ye number badal saktay hain

      await users.updateOne(
        { wallet },
        { $set: { referredBy: code }, $inc: { balance: REFERRAL_BONUS } }
      );

      await users.updateOne(
        { wallet: referrer.wallet },
        { $inc: { referralCount: 1, referralEarnings: REFERRAL_BONUS, balance: REFERRAL_BONUS } }
      );

      return res.status(200).json({
        success: true,
        message: `Referral applied! You earned ${REFERRAL_BONUS} LORCA.`,
        bonus: REFERRAL_BONUS
      });
    }

    return res.status(400).json({ success: false, error: 'Invalid action' });

  } catch (error) {
    console.error('Referral API Error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Database connection error' });
  } finally {
    if (client) {
      await client.close();
    }
  }
}

function generateReferralCode(wallet) {
  const prefix = wallet.slice(0, 4).toUpperCase();
  const suffix = wallet.slice(-4).toUpperCase();
  const random = Math.floor(100 + Math.random() * 900);
  return `${prefix}${random}${suffix}`;
}
