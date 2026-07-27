import { 
  Connection, 
  Keypair, 
  PublicKey, 
  Transaction, 
  SystemProgram, 
  LAMPORTS_PER_SOL, 
  clusterApiUrl 
} from '@solana/web3.js';
import bs58 from 'bs58';

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // Browser testing (GET)
  if (req.method === 'GET') {
    return res.status(200).json({
      success: true,
      message: "Lorca Solana Withdrawal API is active and ready!"
    });
  }

  // Withdrawal logic (POST)
  if (req.method === 'POST') {
    try {
      const { receiverAddress, amount } = req.body || {};

      if (!receiverAddress || !amount) {
        return res.status(400).json({
          success: false,
          message: "receiverAddress aur amount dono required hain."
        });
      }

      // 1. Solana Connection Setup (Mainnet Beta)
      const connection = new Connection(clusterApiUrl('mainnet-beta'), 'confirmed');

      // 2. Load Secret Key from Vercel Environment Variables
      const privateKeyEnv = process.env.SOLANA_PRIVATE_KEY;
      if (!privateKeyEnv) {
        throw new Error("Server Environment Variable (SOLANA_PRIVATE_KEY) set nahi hai.");
      }

      const secretKey = bs58.decode(privateKeyEnv);
      const senderKeypair = Keypair.fromSecretKey(secretKey);

      // 3. Receiver Address Verification
      const toPublicKey = new PublicKey(receiverAddress);

      // 4. Create Transfer Instruction
      const transferInstruction = SystemProgram.transfer({
        fromPubkey: senderKeypair.publicKey,
        toPubkey: toPublicKey,
        lamports: Math.round(amount * LAMPORTS_PER_SOL), // SOL to Lamports
      });

      const transaction = new Transaction().add(transferInstruction);

      // 5. Fetch Latest Blockhash & Sign Transaction
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = senderKeypair.publicKey;

      // 6. Send Transaction to Solana Network
      const signature = await connection.sendTransaction(transaction, [senderKeypair]);

      return res.status(200).json({
        success: true,
        message: "Solana withdrawal request complete ho gayi hai!",
        data: {
          txHash: signature,
          sender: senderKeypair.publicKey.toBase58(),
          receiver: receiverAddress,
          amount: amount
        }
      });

    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Solana Transaction Failed",
        error: error.message
      });
    }
  }

  return res.status(405).json({ success: false, message: "Method Not Allowed" });
}
