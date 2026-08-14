const mongoose = require("mongoose");

const FixedStakeSchema = new mongoose.Schema({
  wallet: { type: String, required: true, index: true },
  amount: { type: Number, required: true },        // tokens staked (500,000)
  bonusPercent: { type: Number, default: 20 },
  payoutAmount: { type: Number, required: true },   // amount + 20%
  stakeTxSignature: { type: String, required: true },
  withdrawTxSignature: { type: String, default: null },
  stakedAt: { type: Date, default: Date.now },
  unlockAt: { type: Date, required: true },
  status: {
    type: String,
    enum: ["active", "claimed"],
    default: "active",
  },
});

// One active stake per wallet at a time
FixedStakeSchema.index({ wallet: 1, status: 1 });

module.exports = mongoose.models.FixedStake || mongoose.model("FixedStake", FixedStakeSchema);
