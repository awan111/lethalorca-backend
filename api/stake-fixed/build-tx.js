export default async function handler(req, res) {
  // 1. Mandatory CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // 2. Preflight Check (Browser OPTIONS Pass)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 3. POST Request Handling
  if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const { wallet, amount } = body || {};

      if (!wallet || !amount) {
        return res.status(400).json({ error: "Wallet and amount missing" });
      }

      return res.status(200).json({
        success: true,
        message: "Request received successfully!",
        wallet: wallet,
        amount: amount
      });
    } catch (err) {
      return res.status(500).json({ error: "Processing error: " + err.message });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
