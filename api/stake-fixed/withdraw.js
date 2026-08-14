const mongoose = require("mongoose");
const {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
} = require("@solana/web3.js");
const {
  getAssociatedTokenAddress,
  createTransferInstruction,
  createAssociatedTokenAccountInstruction,
  getAccount,
} = require("@solana/spl-token");
const bs58 = require("bs58");
const FixedStake = require("../../models/FixedStake");

async function connectDB() {
  if (mongoose.connection.readyState === 1) return;
  await mongoose.connect(process.env.MONGODB_URI);
}

const MINT_ADDRESS = process.env.LORCA_MINT_ADDRESS || "7RqpgT532tsYakbgnTXECC4MHTEGu5HzBxVAkAAHpump";
const TOKEN_DECIMALS = Number(process.env.LORCA_DECIMALS || 6);

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { wallet } = req.body;
    if (!wallet) return res.status(400).json({ error: "wallet required" });

    await connectDB();
    const stake = await FixedStake.findOne({ wallet, status: "active" }).sort({ stakedAt: -1 });
    if (!stake) return res.status(404).json({ error: "No active stake found" });

    if (new Date() < stake.unlockAt) {
      return res.status(400).json({ error: "Lock period not yet complete" });
    }

    // TREASURY_PRIVATE_KEY must be set as a Vercel env var — never hard-code it.
    const treasuryKeypair = Keypair.fromSecretKey(bs58.decode(process.env.TREASURY_PRIVATE_KEY));
    const connection = new Connection(process.env.HELIUS_RPC_URL, "confirmed");
    const mint = new PublicKey(MINT_ADDRESS);
    const userWallet = new PublicKey(wallet);

    const treasuryAta = await getAssociatedTokenAddress(mint, treasuryKeypair.publicKey);
    const userAta = await getAssociatedTokenAddress(mint, userWallet);

    const tx = new Transaction();
    try {
      await getAccount(connection, userAta);
    } catch {
      tx.add(
        createAssociatedTokenAccountInstruction(
          treasuryKeypair.publicKey,
          userAta,
          userWallet,
          mint
        )
      );
    }

    const rawAmount = BigInt(stake.payoutAmount) * BigInt(10 ** TOKEN_DECIMALS);
    tx.add(
      createTransferInstruction(treasuryAta, userAta, treasuryKeypair.publicKey, rawAmount)
    );

    const sig = await sendAndConfirmTransaction(connection, tx, [treasuryKeypair]);

    stake.status = "claimed";
    stake.withdrawTxSignature = sig;
    await stake.save();

    return res.json({ success: true, amount: stake.payoutAmount, txSignature: sig });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Withdrawal failed, please try again or contact support" });
  }
};
