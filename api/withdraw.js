// api/withdraw.js

export default async function handler(req, res) {
  // CORS Headers (Browser requests allow karne ke liye)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Preflight OPTIONS request handle karne ke liye
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Sirf POST request accept karein
  if (req.method === 'POST') {
    try {
      const { userId, amount, paymentMethod, accountNumber } = req.body;

      // Validation
      if (!userId || !amount || !accountNumber) {
        return res.status(400).json({
          success: false,
          message: "Tamam required fields (userId, amount, accountNumber) muhayya karein."
        });
      }

      // Yahan apna DB logic ya withdrawal processing code likhein
      // Example:
      const transactionId = "TXN_" + Date.now();

      return res.status(200).json({
        success: true,
        message: "Withdrawal request kamyabi se submit ho gayi hai.",
        data: {
          transactionId,
          userId,
          amount,
          status: "Pending"
        }
      });

    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Server Error",
        error: error.message
      });
    }
  }

  // Agar POST ke ilawa koi method ho
  return res.status(405).json({
    success: false,
    message: "Method Not Allowed. Sirf POST request supported hai."
  });
}
