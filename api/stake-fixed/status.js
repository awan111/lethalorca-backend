const mongoose = require("mongoose");
const FixedStake = require("../../models/FixedStake");

async function connectDB() {
  if (mongoose.connection.readyState === 1) return;
  await mongoose.connect(process.env.MONGODB_URI);
}

module.exports = async (req, res) => {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { wallet } = req.query;
    if (!wallet) return res.status(400).json({ error: "wallet required" });

    await connectDB();
    const stake = await FixedStake.findOne({ wallet, status: "active" }).sort({ stakedAt: -1 });

    if (!stake) {
      return res.json({ active: false, claimable: false });
    }

    const now = new Date();
    const claimable = now >= stake.unlockAt;

    return res.json({
      active: !claimable,
      claimable,
      unlockAt: stake.unlockAt,
      amount: stake.amount,
      payoutAmount: stake.payoutAmount,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
};
