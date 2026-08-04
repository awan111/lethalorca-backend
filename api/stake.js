// api/stake.js
const mongoose = require("mongoose");
const Stake = require("../models/Stake");

// MongoDB Connection helper
const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) return;
  return mongoose.connect(process.env.MONGO_URI);
};

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    await connectDB();
  } catch (err) {
    return res.status(500).json({ error: "Database connection failed" });
  }

  const { action } = req.query;

  try {
    // 1. Create New Stake
    if (req.method === "POST" && action === "create") {
      const { wallet, amount, lockDays } = req.body;

      if (!wallet || !amount || amount <= 0 || !lockDays) {
        return res.status(400).json({ error: "Invalid parameters" });
      }

      // Multiplier aur APR Tier set karna
      let apr = 40;
      let mult = 1;
      if (Number(lockDays) === 7) {
        apr = 90;
        mult = 2;
      } else if (Number(lockDays) === 14) {
        apr = 150;
        mult = 3;
      }

      const startedAt = new Date();
      const maturesAt = new Date(startedAt.getTime() + lockDays * 24 * 60 * 60 * 1000);

      const newStake = new Stake({
        wallet,
        amount,
        mult,
        apr,
        lockDays,
        startedAt,
        maturesAt,
        status: "active",
      });

      await newStake.save();
      return res.status(200).json({ success: true, stake: newStake });
    }

    // 2. Fetch User Stakes List
    if (req.method === "GET" && action === "list") {
      const { wallet } = req.query;
      if (!wallet) return res.status(400).json({ error: "Wallet address required" });

      const stakes = await Stake.find({ wallet }).sort({ startedAt: -1 });
      return res.status(200).json({ success: true, stakes });
    }

    // 3. Claim Matured Stake
    if (req.method === "POST" && action === "claim") {
      const { stakeId, wallet } = req.body;

      const stake = await Stake.findOne({ _id: stakeId, wallet, status: "active" });
      if (!stake) {
        return res.status(404).json({ error: "Active stake not found" });
      }

      const now = new Date();
      if (now < stake.maturesAt) {
        return res.status(400).json({ error: "Stake has not matured yet" });
      }

      // Reward calculation: (Amount * APR / 100) * (LockDays / 365)
      const reward = (stake.amount * (stake.apr / 100)) * (stake.lockDays / 365);
      const totalPayout = stake.amount + reward;

      stake.status = "claimed";
      stake.rewardPaid = reward;
      await stake.save();

      return res.status(200).json({
        success: true,
        stakedAmount: stake.amount,
        rewardAmount: reward,
        totalPayout,
      });
    }

    return res.status(400).json({ error: "Invalid action or request method" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
};
