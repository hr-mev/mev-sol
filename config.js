import dotenv from 'dotenv';
import { Keypair } from '@solana/web3.js';

dotenv.config();

// Ensure RPC endpoint starts with https://
const formatEndpoint = (endpoint) => {
    if (!endpoint) return 'https://api.mainnet-beta.solana.com';
    if (!endpoint.startsWith('http://') && !endpoint.startsWith('https://')) {
        return `https://${endpoint}`;
    }
    return endpoint;
};

const config = {
    rpcEndpoint: formatEndpoint(process.env.RPC_ENDPOINT),
    minProfitThreshold: parseFloat(process.env.MIN_PROFIT_THRESHOLD || '0.01'),
    maxTradeSize: parseFloat(process.env.MAX_TRADE_SIZE || '1000'),
    jitoTipLamports: parseInt(process.env.JITO_TIP_LAMPORTS || '100000'),
    keypair: null,
    tipAccounts: [
        "96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5",
        "HFqU5x63VTqvQss8hp11i4wVV8bD44PvwucfZ2bU7gRe",
        "Cw8CFyM9FkoMi7K7Crf6HNQqf4uEMzpKw6QNghXLvLkY",
        "ADaUMid9yfUytqMBgopwjb2DTLSokTSzL1zt6iGPaS49",
        "DfXygSm4jCyNCybVYYK6DwvWqjKee8pbDmJGcLWNDXjh",
        "ADuUkR4vqLUMWXxW9gh6D6L8pMSawimctcNZ5pGwDcEt",
        "DttWaMuVvTiduZRnguLF7jNxTgiMBZ1hyAumKUiL2KRL",
        "3AVi9Tg9Uo68tJfuvoKvqKNWKkC5wPdSSdeBnizKZ6jT"
    ]
};

try {
    if (process.env.PRIVATE_KEY) {
        const privateKeyArray = JSON.parse(process.env.PRIVATE_KEY);
        config.keypair = Keypair.fromSecretKey(new Uint8Array(privateKeyArray));
    } else {
        console.warn('No private key provided in .env file');
    }
} catch (error) {
    console.error('Error parsing private key:', error);
    process.exit(1);
}

export default config;