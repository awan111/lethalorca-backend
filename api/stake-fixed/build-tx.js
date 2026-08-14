import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { createTransferInstruction, getAssociatedTokenAddress } from '@solana/spl-token';

export default async function handler(req, res) {
  // 1. Mandatory CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // 2. Preflight (OPTIONS) Check
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 3. Handling POST Request
  if (req.method === 'POST') {
    try {
      const { wallet, amount } = req.body;

      if (!wallet || !amount) {
        return res.status(400).json({ error: "Wallet and amount are required" });
      }

      // AAPKA ADMIN / VAULT WALLET ADDRESS (Jahan 5 Lac LORCA receive honge)
      const VAULT_WALLET = "3bveebwJQgzrj8GFEwXExbDZuZEexQuNmi7bKXAbdndE";
      const LORCA_MINT = "7RqpgT532tsYakbgnTXECC4MHTEGu5HzBxVAkAAHpump";

      const connection = new Connection("https://rpc.ankr.com/solana", "confirmed");

      const userPublicKey = new PublicKey(wallet);
      const vaultPublicKey = new PublicKey(VAULT_WALLET);
      const mintPublicKey = new PublicKey(LORCA_MINT);

      // User aur Vault ke SPL Token Accounts search karna
      const userTokenAccount = await getAssociatedTokenAddress(mintPublicKey, userPublicKey);
      const vaultTokenAccount = await getAssociatedTokenAddress(mintPublicKey, vaultPublicKey);

      // Transaction Create Karna (Transferring tokens)
      const transaction = new Transaction().add(
        createTransferInstruction(
          userTokenAccount,
          vaultTokenAccount,
          userPublicKey,
          amount * 10 ** 6 // Token Decimals ke hisab se (agar 6 decimals hain)
        )
      );

      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = userPublicKey;

      const serializedTransaction = transaction.serialize({ requireAllSignatures: false });

      return res.status(200).json({
        success: true,
        transaction: serializedTransaction.toString('base64')
      });

    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
