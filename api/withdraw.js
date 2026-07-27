// api/withdraw.js

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Browser testing (GET) ke liye basic message
  if (req.method === 'GET') {
    return res.status(200).json({
      success: true,
      message: "Withdrawal API is active and running!"
    });
  }

  // Actual Withdrawal processing (POST)
  if (req.method === 'POST') {
    try {
      const { userId, amount, paymentMethod, accountNumber } = req.body || {};

      if (!userId || !amount || !accountNumber) {
        return res.status(400).json({
          success: false,
          message: "Tamam required fields (userId, amount, accountNumber) muhayya karein."
        });
      }

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

  return res.status(405).json({
    success: false,
    message: "Method Not Allowed"
  });
}
