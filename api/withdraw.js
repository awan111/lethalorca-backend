import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { getOrCreateAssociatedTokenAccount, transfer } from '@solana/spl-token';
import bs58 from 'bs58';

export default async function handler(req, res) {
  // 1. Set CORS headers ALWAYS (First lines of function)
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // 2. Handle Preflight OPTIONS Request with HTTP 200 Status
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // 3. Only allow POST requests for actual withdrawal
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  const { receiverAddress, amount } = req.body || {};

  if (!receiverAddress || !amount) {
    return res.status(400).json({ success: false, message: 'Missing receiverAddress or amount' });
  }

  try {
    // 4. Solana RPC Connection
    const RPC_URL = process.env.HELIUS_RPC_URL || "https://mainnet.helius-rpc.com/?api-key=e99cd0cc-8db8-40a8-b64d-ca9d7f082e66";
    const connection = new Connection(RPC_URL, 'confirmed');

    // 5. Admin Private Key Check
    if (!process.env.SOLANA_PRIVATE_KEY) {
      return res.status(500).json({ 
        success: false, 
        message: 'SOLANA_PRIVATE_KEY is not configured on Vercel Environment Variables' 
      });
    }

    const secretKey = bs58.decode(process.env.SOLANA_PRIVATE_KEY);
    const adminKeypair = Keypair.fromSecretKey(secretKey);

    // 6. Token Details (LORCA - 6 Decimals)
    const LORCA_MINT_ADDRESS = new PublicKey("7RqpgT532tsYakbgnTXECC4MHTEGu5HzBxVAkAAHpump");
    const receiverPublicKey = new PublicKey(receiverAddress);
    const decimals = 6;

    // 7. Token Accounts
    const adminTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      adminKeypair,
      LORCA_MINT_ADDRESS,
      adminKeypair.publicKey
    );

    const receiverTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      adminKeypair,
      LORCA_MINT_ADDRESS,
      receiverPublicKey
    );

    // 8. Amount Calculation
    const rawAmount = Math.floor(Number(amount) * Math.pow(10, decimals));

    // 9. Execute Transfer
    const txHash = await transfer(
      connection,
      adminKeypair,
      adminTokenAccount.address,
      receiverTokenAccount.address,
      adminKeypair.publicKey,
      rawAmount
    );

    return res.status(200).json({
      success: true,
      message: 'LORCA Tokens transferred successfully!',
      data: { txHash }
    });

  } catch (error) {
    console.error("LORCA Transfer Error:", error);
    return res.status(500).json({ 
      success: false, 
      message: error.message || 'Token transfer failed' 
    });
  }
}
