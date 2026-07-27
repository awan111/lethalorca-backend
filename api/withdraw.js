export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // GET Request Test
  if (req.method === 'GET') {
    return res.status(200).json({
      success: true,
      message: "Lorca Solana Withdrawal API active hai aur bilkul ready hai!"
    });
  }

  if (req.method === 'POST') {
    try {
      const { receiverAddress, amount } = req.body || {};

      if (!receiverAddress || !amount) {
        return res.status(400).json({
          success: false,
          message: "receiverAddress aur amount dono zaroori hain."
        });
      }

      const privateKeyEnv = process.env.SOLANA_PRIVATE_KEY;
      if (!privateKeyEnv) {
        return res.status(500).json({
          success: false,
          message: "SOLANA_PRIVATE_KEY environment variable missing hai."
        });
      }

      // Dynamic imports (prevents Vercel module crash)
      const { 
        Connection, 
        Keypair, 
        PublicKey, 
        Transaction, 
        SystemProgram, 
        LAMPORTS_PER_SOL, 
        clusterApiUrl 
      } = await import('@solana/web3.js');
      
      const bs58 = (await import('bs58')).default;

      let secretKey;
      const cleanKey = privateKeyEnv.trim().replace(/^["']|["']$/g, '');
      if (cleanKey.startsWith('[')) {
        secretKey = Uint8Array.from(JSON.parse(cleanKey));
      } else {
        secretKey = bs58.decode(cleanKey);
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
        message: "Solana Transfer Successful!",
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
}
