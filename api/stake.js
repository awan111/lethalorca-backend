import { MongoClient } from 'mongodb';

export default async function handler(req, res) {
  // Always set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Content-Type'
  );

  // Handle preflight immediately without database call
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    return res.status(500).json({ success: false, error: 'MONGODB_URI variable missing on Vercel' });
  }

  let client;
  try {
    client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
    await client.connect();
    const db = client.db('lethalorca');
    const collection = db.collection('stakes');

    const { action, wallet } = req.query;

    if (req.method === 'GET' && action === 'list') {
      if (!wallet) return res.status(400).json({ success: false, error: 'Wallet address required' });
      const stakes = await collection.find({ wallet }).toArray();
      return res.status(200).json({ success: true, stakes });
    }

    if (req.method === 'POST' && action === 'create') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
      const { wallet: userWallet, amount, poolId, days, apr } = body;

      if (!userWallet || !amount) {
        return res.status(400).json({ success: false, error: 'Missing wallet address or amount' });
      }

      const newStake = {
        wallet: userWallet,
        amount: parseFloat(amount),
        poolId: poolId || 'default-pool',
        days: parseInt(days) || 30,
        apr: parseFloat(apr) || 12,
        createdAt: new Date(),
        status: 'active'
      };

      await collection.insertOne(newStake);
      return res.status(200).json({ success: true, stake: newStake });
    }

    return res.status(400).json({ success: false, error: 'Invalid action specified' });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Database connection error' });
  } finally {
    if (client) {
      await client.close();
    }
  }
}
