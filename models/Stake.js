const mongoose = require("mongoose");

const stakeSchema = new mongoose.Schema({
  wallet: {
    type: String,
    required: true,
    index: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  mult: {
    type: Number,
    required: true,
  },
  apr: {
    type: Number,
    required: true,
  },
  lockDays: {
    type: Number,
    required: true,
  },
  startedAt: {
    type: Date,
    default: Date.now,
  },
  maturesAt: {
    type: Date,
    required: true,
  },
  status: {
    type: String,
    enum: ["active", "claimed", "unstaked_early"],
    default: "active",
  },
  rewardPaid: {
    type: Number,
    default: 0,
  },
});

module.exports = mongoose.model("Stake", stakeSchema);
