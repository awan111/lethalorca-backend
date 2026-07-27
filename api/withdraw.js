import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { getOrCreateAssociatedTokenAccount, createTransferInstruction } from '@solana/spl-token';
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
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  try {
    const { recipientAddress, amount } = req.body || {};

    if (!recipientAddress || !amount || amount <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid parameters' });
    }

    const privateKey = process.env.MASTER_PRIVATE_KEY;
    if (!privateKey) {
      return res.status(500).json({ success: false, error: 'MASTER_PRIVATE_KEY missing in Vercel' });
    }

    const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
    const connection = new Connection(rpcUrl, 'confirmed');

    // Private Key Handling (Base58 or Array String)
    let masterWallet;
    const trimmedKey = privateKey.trim();
    if (trimmedKey.startsWith('[')) {
      masterWallet = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(trimmedKey)));
    } else {
      masterWallet = Keypair.fromSecretKey(bs58.decode(trimmedKey));
    }

    const mintAddress = process.env.LORCA_MINT_ADDRESS;
    if (!mintAddress) {
      return res.status(500).json({ success: false, error: 'LORCA_MINT_ADDRESS missing in Vercel' });
    }

    const tokenMintAddress = new PublicKey(mintAddress.trim());
    const recipient = new PublicKey(recipientAddress);

    const fromTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      masterWallet,
      tokenMintAddress,
      masterWallet.publicKey
    );

    const toTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      masterWallet,
      tokenMintAddress,
      recipient
    );

    const decimals = 6; 
    const transferAmount = BigInt(Math.floor(amount * Math.pow(10, decimals)));

    const transactionInstruction = createTransferInstruction(
      fromTokenAccount.address,
      toTokenAccount.address,
      masterWallet.publicKey,
      transferAmount
    );

    const { web3 } = await import('@solana/web3.js');
    const transaction = new web3.Transaction().add(transactionInstruction);
    const signature = await web3.sendAndConfirmTransaction(connection, transaction, [masterWallet]);

    return res.status(200).json({
      success: true,
      message: 'Tokens transferred successfully!',
      signature
    });

  } catch (error) {
    console.error('Withdrawal error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Transaction failed' });
  }
}
