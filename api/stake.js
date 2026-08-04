import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
let cachedClient = null;

async function connectToDatabase() {
  if (cachedClient) return cachedClient;
  if (!uri) throw new Error('MONGODB_URI environment variable is missing');
  
  const client = new MongoClient(uri);
  await client.connect();
  cachedClient = client;
  return client;
}

export default async function handler(req, res) {
  // Set CORS Headers for all requests
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Content-Type'
  );

  // Handle Browser Preflight (OPTIONS) Check
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const client = await connectToDatabase();
    const db = client.db('lethalorca');
    const collection = db.collection('stakes');

    const { action, wallet } = req.query;

    // GET Request: Fetch stakes for a wallet
    if (req.method === 'GET' && action === 'list') {
      if (!wallet) return res.status(400).json({ error: 'Wallet address required' });
      const stakes = await collection.find({ wallet }).toArray();
      return res.status(200).json({ success: true, stakes });
    }

    // POST Request: Create a new stake
    if (req.method === 'POST' && action === 'create') {
      const { wallet, amount, poolId, days, apr } = req.body || {};
      if (!wallet || !amount) {
        return res.status(400).json({ error: 'Missing wallet or amount in request payload' });
      }

      const newStake = {
        wallet,
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

    return res.status(400).json({ error: 'Invalid action or request method' });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
}
