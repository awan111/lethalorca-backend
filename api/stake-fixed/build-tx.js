export default async function handler(req, res) {
  // 1. CORS Headers (Sub se pehle add karne hain)
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // 2. Browser ki OPTIONS request ko handle karna
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 3. Yahan se aapka purana build-tx logic aayega:
  if (req.method === 'POST') {
    const { wallet, amount } = req.body;
    // ... aapka baki ka code
  }

const {
  Connection,
  PublicKey,
  Transaction,
} = require("@solana/web3.js");
const {
  getAssociatedTokenAddress,
  createTransferInstruction,
  createAssociatedTokenAccountInstruction,
  getAccount,
} = require("@solana/spl-token");

const MINT_ADDRESS = process.env.LORCA_MINT_ADDRESS || "7RqpgT532tsYakbgnTXECC4MHTEGu5HzBxVAkAAHpump";
const TREASURY_WALLET = process.env.TREASURY_WALLET_PUBLIC_KEY; // set in Vercel dashboard
const TOKEN_DECIMALS = Number(process.env.LORCA_DECIMALS || 6); // confirm against your mint
const STAKE_AMOUNT = 500000;

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { wallet, amount } = req.body;
    if (!wallet) return res.status(400).json({ error: "wallet required" });
    if (Number(amount) !== STAKE_AMOUNT) {
      return res.status(400).json({ error: `Stake amount must be exactly ${STAKE_AMOUNT} LORCA` });
    }
    if (!TREASURY_WALLET) return res.status(500).json({ error: "Treasury wallet not configured" });

    const connection = new Connection(process.env.HELIUS_RPC_URL, "confirmed");
    const mint = new PublicKey(MINT_ADDRESS);
    const fromWallet = new PublicKey(wallet);
    const treasuryWallet = new PublicKey(TREASURY_WALLET);

    const fromAta = await getAssociatedTokenAddress(mint, fromWallet);
    const treasuryAta = await getAssociatedTokenAddress(mint, treasuryWallet);

    const tx = new Transaction();

    // Ensure treasury ATA exists (payer = user; fine since it's a one-time setup cost)
    try {
      await getAccount(connection, treasuryAta);
    } catch {
      tx.add(
        createAssociatedTokenAccountInstruction(fromWallet, treasuryAta, treasuryWallet, mint)
      );
    }

    const rawAmount = BigInt(STAKE_AMOUNT) * BigInt(10 ** TOKEN_DECIMALS);
    tx.add(createTransferInstruction(fromAta, treasuryAta, fromWallet, rawAmount));

    tx.feePayer = fromWallet;
    const { blockhash } = await connection.getLatestBlockhash("confirmed");
    tx.recentBlockhash = blockhash;

    const serialized = tx.serialize({ requireAllSignatures: false, verifySignatures: false });
    return res.json({ transaction: serialized.toString("base64") });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to build transaction" });
  }
};
