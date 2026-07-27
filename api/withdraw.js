const { 
  Connection, 
  Keypair, 
  PublicKey, 
  Transaction, 
  SystemProgram, 
  LAMPORTS_PER_SOL, 
  clusterApiUrl 
} = require('@solana/web3.js');
const bs58 = require('bs58');

module.exports = async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    return res.status(200).json({
      success: true,
      message: "Lorca Solana Withdrawal API active hai!"
    });
  }

  if (req.method === 'POST') {
    try {
      const { receiverAddress, amount } = req.body || {};

      if (!receiverAddress || !amount) {
        return res.status(400).json({
          success: false,
          message: "receiverAddress aur amount zaroori hain."
        });
      }

      const privateKeyEnv = process.env.SOLANA_PRIVATE_KEY;
      if (!privateKeyEnv) {
        return res.status(500).json({
          success: false,
          message: "SOLANA_PRIVATE_KEY environment variable set nahi hai."
        });
      }

      let secretKey;
      try {
        if (privateKeyEnv.trim().startsWith('[')) {
          secretKey = Uint8Array.from(JSON.parse(privateKeyEnv));
        } else {
          secretKey = bs58.decode(privateKeyEnv.trim());
        }
      } catch (e) {
        return res.status(500).json({
          success: false,
          message: "Private Key Format Invalid hai.",
          error: e.message
        });
      }

      const senderKeypair = Keypair.fromSecretKey(secretKey);
      const connection = new Connection(clusterApiUrl('mainnet-beta'), 'confirmed');
      const toPublicKey = new PublicKey(receiverAddress);

      const transferInstruction = SystemProgram.transfer({
        fromPubkey: senderKeypair.publicKey,
        toPubkey: toPublicKey,
        lamports: Math.round(amount * LAMPORTS_PER_SOL),
      });

      const transaction = new Transaction().add(transferInstruction);

      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = senderKeypair.publicKey;

      const signature = await connection.sendTransaction(transaction, [senderKeypair]);

      return res.status(200).json({
        success: true,
        message: "Transfer Success!",
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
        message: "Solana Execution Error",
        error: error.message
      });
    }
  }

  return res.status(405).json({ success: false, message: "Method Not Allowed" });
};
