const { Connection, PublicKey, Keypair } = require('@solana/web3.js');
const { getOrCreateAssociatedTokenAccount, createTransferInstruction } = require('@solana/spl-token');

module.exports = async (req, res) => {
    // CORS headers taaki aapki GitHub Pages wali game isko call kar sake
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { playerWalletAddress, amount } = req.body;

        if (!playerWalletAddress || !amount) {
            return res.status(400).json({ error: 'Missing parameters' });
        }

        // Solana Mainnet connection setup
        const connection = new Connection("https://api.mainnet-beta.solana.com", "confirmed");

        // Environment Variables se Master Wallet aur Token ki details lena (Secure Way)
        const tokenMintAddress = new PublicKey(process.env.TOKEN_MINT_ADDRESS);
        
        // Master Private Key ko parse karna
        const privateKeyArray = JSON.parse(process.env.MASTER_PRIVATE_KEY);
        const masterWallet = Keypair.fromSecretKey(Uint8Array.from(privateKeyArray));

        const destinationWallet = new PublicKey(playerWalletAddress);

        // 1. Master Wallet ka Token Account dhundna ya banana
        const sourceAccount = await getOrCreateAssociatedTokenAccount(
            connection,
            masterWallet,
            tokenMintAddress,
            masterWallet.publicKey
        );

        // 2. Player Wallet ka Token Account dhundna ya banana
        const destinationAccount = await getOrCreateAssociatedTokenAccount(
            connection,
            masterWallet,
            tokenMintAddress,
            destinationWallet
        );

        // 3. Decimals ke mutabiq amount set karna (Pump.fun tokens ke 6 decimals hote hain)
        const decimals = 6; 
        const transferAmount = BigInt(Math.floor(amount * Math.pow(10, decimals)));

        // 4. Transfer Transaction banana
        const txInstruction = createTransferInstruction(
            sourceAccount.address,
            destinationAccount.address,
            masterWallet.publicKey,
            transferAmount
        );

        const { Transaction } = require('@solana/web3.js');
        const tx = new Transaction().add(txInstruction);
        
        // 5. Sign aur Send karna
        const signature = await connection.sendTransaction(tx, [masterWallet]);

        return res.status(200).json({ success: true, signature });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: error.message });
    }
};
