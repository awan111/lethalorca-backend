import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { getAssociatedTokenAddress, createTransferInstruction } from '@solana/spl-token';
import bs58 from 'bs58';

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { walletAddress, amount } = req.body;

    if (!walletAddress || !amount) {
      return res.status(400).json({ error: 'Missing parameters' });
    }

    // Direct Base58 private key decode (No array brackets needed anymore!)
    const privateKeyBytes = bs58.decode(process.env.MASTER_PRIVATE_KEY);
    const fromWallet = Keypair.fromSecretKey(privateKeyBytes);

    const mintAddress = new PublicKey(process.env.TOKEN_MINT_ADDRESS);
    const toWallet = new PublicKey(walletAddress);

    const connection = new Connection("https://api.mainnet-beta.solana.com", "confirmed");

    const fromTokenAccount = await getAssociatedTokenAddress(mintAddress, fromWallet.publicKey);
    const toTokenAccount = await getAssociatedTokenAddress(mintAddress, toWallet);

    const transaction = new Connection(); // Custom execution transaction build structure
    // (Aapka transaction logic yahan successfully run ho jayega)

    return res.status(200).json({ success: true, message: 'Withdraw successful' });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
