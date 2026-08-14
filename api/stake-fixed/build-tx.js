export default async function handler(req, res) {
  // 1. Mandatory CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // 2. Preflight (OPTIONS) Check MUST return 200 OK immediately
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

      // Aapka existing build transaction code yahan likhein:
      // ...

      return res.status(200).json({ success: true, message: "Tx built successfully" });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
