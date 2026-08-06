const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  wallet: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  balance: {
    type: Number,
    default: 0,
  },
  level: {
    type: Number,
    default: 1,
  },
  energy: {
    type: Number,
    default: 100,
  },
  lastLoginBonus: {
    type: Date,
    default: null,
  },
  lastHourlyBonus: {
    type: Date,
    default: null,
  },

  // ---- Referral System ----
  referralCode: {
    type: String,
    unique: true,
    sparse: true,
    index: true,
  },
  referredBy: {
    type: String,
    default: null,
  },
  referralCount: {
    type: Number,
    default: 0,
  },
  referralEarnings: {
    type: Number,
    default: 0,
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("User", userSchema);
