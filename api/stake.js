import mongoose from "mongoose";

// MongoDB Connection Cache
let isConnected = false;
async function connectDB() {
  if (isConnected) return;
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI environment variable is missing!");
  }
  await mongoose.connect(process.env.MONGO_URI);
  isConnected = true;
}

// Stake Schema & Model (Self-contained)
const stakeSchema = new mongoose.Schema({
  wallet: { type: String, required: true },
  amount: { type: Number, required: true },
  mult: { type: Number, required: true },
  lockDays: { type: Number, required: true },
  apr: { type: Number, required: true },
  startedAt: { type: Date, default: Date.now },
  maturesAt: { type: Date, required: true },
  status: { type: String, default: "active" }, // 'active', 'claimed'
  claimedAt: { type: Date }
});

const Stake = mongoose.models.Stake || mongoose.model("Stake", stakeSchema);

export default async function handler(req, res) {
  // CORS Headers (Cross-Origin Support)
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  try {
    await connectDB();
    const action = req.query.action;

    // 1. LIST STAKES
    if (req.method === "GET" && action === "list") {
      const { wallet } = req.query;
      if (!wallet) return res.status(400).json({ success: false, error: "Wallet required" });

      const stakes = await Stake.find({ wallet }).sort({ startedAt: -1 });
      return res.status(200).json({ success: true, stakes });
    }

    // 2. CREATE STAKE
    if (req.method === "POST" && action === "create") {
      const { wallet, amount, lockDays } = req.body;
      if (!wallet || !amount || !lockDays) {
        return res.status(400).json({ success: false, error: "Missing required fields" });
      }

      let apr = 40;
      let mult = 1;
      if (lockDays === 7) { apr = 90; mult = 2; }
      else if (lockDays === 14) { apr = 150; mult = 3; }

      const startedAt = new Date();
      const maturesAt = new Date(startedAt.getTime() + lockDays * 24 * 60 * 60 * 1000);

      const newStake = new Stake({
        wallet,
        amount,
        mult,
        lockDays,
        apr,
        startedAt,
        maturesAt,
        status: "active"
      });

      await newStake.save();
      return res.status(200).json({ success: true, stake: newStake });
    }

    // 3. CLAIM STAKE
    if (req.method === "POST" && action === "claim") {
      const { stakeId, wallet } = req.body;
      const stake = await Stake.findOne({ _id: stakeId, wallet, status: "active" });

      if (!stake) {
        return res.status(404).json({ success: false, error: "Active stake not found" });
      }

      if (new Date() < new Date(stake.maturesAt)) {
        return res.status(400).json({ success: false, error: "Stake has not matured yet" });
      }

      const reward = stake.amount * (stake.apr / 100) * (stake.lockDays / 365);
      const totalPayout = stake.amount + reward;

      stake.status = "claimed";
      stake.claimedAt = new Date();
      await stake.save();

      return res.status(200).json({ success: true, totalPayout });
    }

    return res.status(400).json({ success: false, error: "Invalid action or HTTP method" });
  } catch (err) {
    console.error("API Error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
