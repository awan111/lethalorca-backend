import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { createTransferInstruction, getAssociatedTokenAddress } from '@solana/spl-token';

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'POST') {
    try {
      const { wallet, amount } = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

      if (!wallet || !amount) {
        return res.status(400).json({ error: "Wallet and amount missing" });
      }

      // 1. Setup Parameters
      const connection = new Connection("https://solana-rpc.publicnode.com", "confirmed");
      const userPubkey = new PublicKey(wallet);
      const mintPubkey = new PublicKey("7RqpgT532tsYakbgnTXECC4MHTEGu5HzBxVAkAAHpump");
      
      // Aapka Pool / Vault Wallet Jahan Tokens Deposit Hoge (Replace if needed)
      const vaultPubkey = new PublicKey("7RqpgT532tsYakbgnTXECC4MHTEGu5HzBxVAkAAHpump"); 

      // 2. Token Accounts Find Karein
      const userAta = await getAssociatedTokenAddress(mintPubkey, userPubkey);
      const vaultAta = await getAssociatedTokenAddress(mintPubkey, vaultPubkey);

      // Amount with decimals (6 decimals standard)
      const rawAmount = Math.floor(amount * 1000000);

      // 3. Instruction Banayein
      const transferIx = createTransferInstruction(
        userAta,
        vaultAta,
        userPubkey,
        rawAmount
      );

      // 4. Transaction Construct Karein
      const transaction = new Transaction().add(transferIx);
      const { blockhash } = await connection.getLatestBlockhash('finalized');
      
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = userPubkey;

      // Serialize Transaction for Phantom
      const serializedTx = transaction.serialize({ requireAllSignatures: false, verifySignatures: false });
      const base64Tx = serializedTx.toString('base64');

      return res.status(200).json({
        success: true,
        transaction: base64Tx
      });

    } catch (err) {
      console.error("TX Build Error:", err);
      return res.status(500).json({ error: "Failed to build transaction: " + err.message });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
