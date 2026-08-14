const mongoose = require("mongoose");
const { Connection } = require("@solana/web3.js");
const FixedStake = require("../../models/FixedStake");

async function connectDB() {
  if (mongoose.connection.readyState === 1) return;
  await mongoose.connect(process.env.MONGODB_URI);
}

const STAKE_AMOUNT = 500000;
const BONUS_PERCENT = 20;

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { wallet, amount, txSignature, lockDays } = req.body;
    if (!wallet || !txSignature) {
      return res.status(400).json({ error: "wallet and txSignature required" });
    }
    if (Number(amount) !== STAKE_AMOUNT) {
      return res.status(400).json({ error: `Amount must be ${STAKE_AMOUNT}` });
    }

    await connectDB();

    // Prevent double-counting the same transaction
    const dup = await FixedStake.findOne({ stakeTxSignature: txSignature });
    if (dup) return res.status(409).json({ error: "Transaction already recorded" });

    // Only one active stake per wallet
    const existingActive = await FixedStake.findOne({ wallet, status: "active" });
    if (existingActive) return res.status(409).json({ error: "Wallet already has an active stake" });

    // Confirm the transaction actually landed on-chain before trusting it
    const connection = new Connection(process.env.HELIUS_RPC_URL, "confirmed");
    const txInfo = await connection.getTransaction(txSignature, {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
    });
    if (!txInfo || txInfo.meta?.err) {
      return res.status(400).json({ error: "Transaction not found or failed on-chain" });
    }

    const days = Number(lockDays) || 7;
    const unlockAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    const payoutAmount = Math.round(STAKE_AMOUNT * (1 + BONUS_PERCENT / 100));

    const stake = await FixedStake.create({
      wallet,
      amount: STAKE_AMOUNT,
      bonusPercent: BONUS_PERCENT,
      payoutAmount,
      stakeTxSignature: txSignature,
      unlockAt,
      status: "active",
    });

    return res.json({ success: true, unlockAt: stake.unlockAt, payoutAmount });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
};
