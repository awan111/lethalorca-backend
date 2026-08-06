import { MongoClient } from 'mongodb';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { getOrCreateAssociatedTokenAccount, transfer } from '@solana/spl-token';
import bs58 from 'bs58';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  const { wallet } = req.body || {};
  if (!wallet) {
    return res.status(400).json({ success: false, error: 'Wallet address required' });
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

    const user = await users.findOne({ wallet });
    if (!user || !user.balance || user.balance <= 0) {
      return res.status(400).json({ success: false, error: 'No referral balance available to claim' });
    }

    const claimAmount = user.balance;

    // ---- Real on-chain transfer (same logic as withdraw.js) ----
    const RPC_URL = process.env.HELIUS_RPC_URL || "https://mainnet.helius-rpc.com/?api-key=e99cd0cc-8db8-40a8-b64d-ca9d7f082e66";
    const connection = new Connection(RPC_URL, 'confirmed');

    if (!process.env.SOLANA_PRIVATE_KEY) {
      return res.status(500).json({ success: false, error: 'SOLANA_PRIVATE_KEY is not configured' });
    }

    const secretKey = bs58.decode(process.env.SOLANA_PRIVATE_KEY);
    const adminKeypair = Keypair.fromSecretKey(secretKey);
    const LORCA_MINT_ADDRESS = new PublicKey("7RqpgT532tsYakbgnTXECC4MHTEGu5HzBxVAkAAHpump");
    const receiverPublicKey = new PublicKey(wallet);
    const decimals = 6;

    const adminTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection, adminKeypair, LORCA_MINT_ADDRESS, adminKeypair.publicKey
    );
    const receiverTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection, adminKeypair, LORCA_MINT_ADDRESS, receiverPublicKey
    );

    const rawAmount = Math.floor(Number(claimAmount) * Math.pow(10, decimals));

    const txHash = await transfer(
      connection, adminKeypair, adminTokenAccount.address, receiverTokenAccount.address,
      adminKeypair.publicKey, rawAmount
    );

    // ---- Reset balance to 0 only after successful transfer ----
    await users.updateOne({ wallet }, { $set: { balance: 0 } });

    return res.status(200).json({
      success: true,
      message: `${claimAmount} LORCA claimed successfully!`,
      txHash,
      amount: claimAmount
    });

  } catch (error) {
    console.error('Claim Referral Error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Claim failed' });
  } finally {
    if (client) await client.close();
  }
}
