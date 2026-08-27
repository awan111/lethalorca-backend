export default async function handler(req, res) {
  // CORS Headers (Browser security rules handle karne ke liye)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // OPTIONS Preflight check
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Sirf POST requests accept karein
  if (req.method === 'POST') {
    try {
      const { wallet, playerId, score, level } = req.body || {};

      // Basic validation
      if (!wallet) {
        return res.status(400).json({ success: false, message: 'Wallet address required' });
      }

      // TODO: Apne database ya Solana payout ka logic yahan add karein

      return res.status(200).json({
        success: true,
        message: 'Claim request received successfully!'
      });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  return res.status(405).json({ message: 'Method Not Allowed' });
}
