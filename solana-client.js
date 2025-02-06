import { Connection, PublicKey, Transaction, SystemProgram } from '@solana/web3.js';
import fetch from 'node-fetch';
import config from './config.js';
import logger from './logger.js';

class SolanaClient {
    constructor() {
        this.connection = new Connection(config.rpcEndpoint, 'confirmed');
        // Using Frankfurt endpoint as example, can be switched based on needs
        this.jitoEndpoint = 'https://frankfurt.mainnet.block-engine.jito.wtf';
        this.isConnected = false;
        this.wallet = null;
    }

    async connect() {
        try {
            if (!config.keypair) {
                throw new Error('No wallet keypair provided in configuration');
            }

            this.wallet = config.keypair;
            const balance = await this.connection.getBalance(this.wallet.publicKey);
            
            logger.info(`Wallet connected: ${this.wallet.publicKey.toString()}`);
            logger.info(`Balance: ${balance / 1e9} SOL`);
            
            // Get updated tip accounts from Jito
            await this.updateTipAccounts();
            
            this.isConnected = true;
            return true;
        } catch (error) {
            logger.error('Failed to connect wallet:', error);
            this.isConnected = false;
            return false;
        }
    }

    async updateTipAccounts() {
        try {
            const response = await fetch(`${this.jitoEndpoint}/api/v1/bundles`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    id: 1,
                    method: 'getTipAccounts',
                    params: []
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            if (data.result && Array.isArray(data.result)) {
                config.tipAccounts = data.result;
                logger.info('Updated tip accounts:', config.tipAccounts);
            }
        } catch (error) {
            logger.warn('Failed to update tip accounts, using defaults:', error);
        }
    }

    getRandomTipAccount() {
        const index = Math.floor(Math.random() * config.tipAccounts.length);
        return new PublicKey(config.tipAccounts[index]);
    }

    async createTipInstruction(tipAmount) {
        const tipAccount = this.getRandomTipAccount();
        return SystemProgram.transfer({
            fromPubkey: this.wallet.publicKey,
            toPubkey: tipAccount,
            lamports: tipAmount
        });
    }

    async submitBundle(transactions) {
        try {
            // Format transactions for Jito
            const formattedTransactions = transactions.map(tx => {
                // Sign transaction if not already signed
                if (!tx.signatures.length) {
                    tx.sign(this.wallet);
                }
                return tx.serialize().toString('base64');
            });

            // Create bundle request
            const bundleRequest = {
                jsonrpc: '2.0',
                id: 1,
                method: 'sendBundle',
                params: [
                    formattedTransactions,
                    { encoding: 'base64' }
                ]
            };

            // Submit to Jito block engine
            const response = await fetch(`${this.jitoEndpoint}/api/v1/bundles`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(bundleRequest)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
            }

            const result = await response.json();
            logger.info('Bundle submitted successfully:', result);
            return result;
        } catch (error) {
            logger.error('Error submitting bundle:', error);
            throw error;
        }
    }

    async checkBundleStatus(bundleId) {
        try {
            const response = await fetch(`${this.jitoEndpoint}/api/v1/bundles`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    id: 1,
                    method: 'getBundleStatuses',
                    params: [[bundleId]]
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            return result.result;
        } catch (error) {
            logger.error('Error checking bundle status:', error);
            throw error;
        }
    }

    async createTradeBundle(tradeInstructions) {
        try {
            // Create main transaction with trade instructions
            const tradeTx = new Transaction();
            tradeInstructions.forEach(instruction => tradeTx.add(instruction));
            
            // Add tip instruction to the main transaction
            tradeTx.add(await this.createTipInstruction(config.jitoTipLamports));
            
            // Set recent blockhash and fee payer
            tradeTx.recentBlockhash = (await this.connection.getLatestBlockhash()).blockhash;
            tradeTx.feePayer = this.wallet.publicKey;

            return [tradeTx];
        } catch (error) {
            logger.error('Error creating trade bundle:', error);
            throw error;
        }
    }
}

export default SolanaClient;