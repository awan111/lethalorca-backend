// api/withdraw.js
// Vercel Serverless Function — POST /api/withdraw   body: { wallet, amount }
//
// This sends REAL $LORCA SPL tokens from your treasury wallet to the user's wallet,
// then deducts the amount from their MongoDB balance. Mirrors the same pattern as
// your original api/transfer.js withdrawal function.
//
// REQUIRED Vercel Environment Variables (Settings > Environment Variables):
//   MONGODB_URI          - already set
//   HELIUS_RPC_URL        - your Helius RPC endpoint (same one your backend already uses)
//   TREASURY_PRIVATE_KEY  - base58-encoded secret key of the wallet that HOLDS the $LORCA
//                           supply and pays out withdrawals. NEVER commit this to GitHub —
//                           only set it in Vercel's dashboard as an encrypted env var.
//
// Treat the treasury wallet exactly like you were told to treat the previously-exposed
// wallet: keep its private key ONLY in Vercel env vars, never in code, chat, or GitHub.

import { MongoClient } from "mongodb";
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  getOrCreateAssociatedTokenAccount,
  createTransferCheckedInstruction,
  getMint,
} from "@solana/spl-token";
import bs58 from "bs58";

const LORCA_MINT = "7RqpgT532tsYakbgnTXECC4MHTEGu5HzBxVAkAAHpump";
const MIN_WITHDRAW = 500; // adjust if you want a different minimum

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "lethalorca";

let cachedClient = null;
async function getDb() {
  if (cachedClient) return cachedClient.db(dbName);
  const client = new MongoClient(uri);
  await client.connect();
  cachedClient = client;
  return client.db(dbName);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { wallet, amount } = req.body || {};
  const amt = Number(amount);

  if (!wallet) return res.status(400).json({ error: "wallet is required" });
  if (!amt || amt <= 0) return res.status(400).json({ error: "invalid amount" });
  if (amt < MIN_WITHDRAW) {
    return res.status(400).json({ error: `Minimum withdrawal is ${MIN_WITHDRAW} $LORCA` });
  }

  let recipientPubkey;
  try {
    recipientPubkey = new PublicKey(wallet);
  } catch {
    return res.status(400).json({ error: "invalid wallet address" });
  }

  const db = await getDb();
  const users = db.collection("users");

  // Atomically deduct the balance ONLY if the user actually has enough — this prevents
  // double-withdraw race conditions (e.g. two rapid clicks).
  const deducted = await users.findOneAndUpdate(
    { wallet, lorcaBalance: { $gte: amt } },
    { $inc: { lorcaBalance: -amt } },
    { returnDocument: "after" }
  );

  if (!deducted || !deducted.value) {
    return res.status(400).json({ error: "Insufficient balance" });
  }

  try {
    const connection = new Connection(process.env.HELIUS_RPC_URL, "confirmed");
    const treasury = Keypair.fromSecretKey(bs58.decode(process.env.TREASURY_PRIVATE_KEY));
    const mintPubkey = new PublicKey(LORCA_MINT);
    const mintInfo = await getMint(connection, mintPubkey);

    const treasuryTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      treasury,
      mintPubkey,
      treasury.publicKey
    );

    const recipientTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      treasury, // treasury pays the small rent fee to create the recipient's token account if needed
      mintPubkey,
      recipientPubkey
    );

    const rawAmount = BigInt(Math.round(amt * 10 ** mintInfo.decimals));

    const transferIx = createTransferCheckedInstruction(
      treasuryTokenAccount.address,
      mintPubkey,
      recipientTokenAccount.address,
      treasury.publicKey,
      rawAmount,
      mintInfo.decimals
    );

    const tx = new Transaction().add(transferIx);
    const txSignature = await sendAndConfirmTransaction(connection, tx, [treasury]);

    return res.status(200).json({
      success: true,
      txSignature,
      balance: deducted.value.lorcaBalance,
    });
  } catch (err) {
    console.error("withdraw error:", err);
    // On-chain transfer failed — refund the deducted balance so the user doesn't lose tokens.
    await users.updateOne({ wallet }, { $inc: { lorcaBalance: amt } });
    return res.status(500).json({ error: "Transfer failed, balance refunded. Try again." });
  }
}
