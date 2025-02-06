// atomic-executor.js
import { Transaction, PublicKey } from '@solana/web3.js';
import { Jupiter } from '@jup-ag/core';
import logger from './logger.js';

class AtomicExecutor {
    constructor(solanaClient) {
        this.solanaClient = solanaClient;
        this.jupiter = null;
        this.slippageBps = 50; // 0.5% slippage tolerance
    }

    async initialize() {
        // Initialize Jupiter SDK for route computation
        this.jupiter = await Jupiter.load({
            connection: this.solanaClient.connection,
            cluster: 'mainnet-beta',
            user: this.solanaClient.wallet.publicKey,
        });
        logger.info('Jupiter SDK initialized for atomic execution');
    }

    async executeAtomicArbitrage(opportunity) {
        try {
            // Convert string token addresses to PublicKey objects
            const tokenMint = new PublicKey(opportunity.token);
            const usdcMint = new PublicKey(this.solanaClient.tokens.USDC);

            // Step 1: Calculate the input amount in USDC (lamports)
            const inputAmount = this.calculateInputAmount(opportunity);

            // Step 2: Get the routes for both trades
            const routes = await this.jupiter.computeRoutes({
                inputMint: usdcMint,
                outputMint: tokenMint,
                amount: inputAmount,
                slippageBps: this.slippageBps,
                onlyDirectRoutes: false,
            });

            if (!routes.routesInfos.length) {
                logger.warn('No viable routes found for arbitrage');
                return null;
            }

            // Step 3: Select the best route
            const bestRoute = routes.routesInfos[0];

            // Step 4: Create atomic transaction
            const { transactions } = await this.jupiter.exchange({
                routeInfo: bestRoute,
            });

            // Step 5: Add Jito-specific instructions
            const jitoTipAccount = this.selectRandomTipAccount();
            transactions.swapTransaction.add(
                this.createJitoTipInstruction(jitoTipAccount)
            );

            // Step 6: Sign and send transaction
            const signature = await this.solanaClient.sendAndConfirmTransaction(
                transactions.swapTransaction,
                { skipPreflight: true }
            );

            logger.info(`Atomic arbitrage executed successfully: ${signature}`);
            return signature;

        } catch (error) {
            logger.error('Error executing atomic arbitrage:', error);
            return null;
        }
    }

    calculateInputAmount(opportunity) {
        // Convert USDC amount to lamports
        return this.solanaClient.usdcToLamports(opportunity.tradeAmount);
    }

    selectRandomTipAccount() {
        const tipAccounts = this.solanaClient.config.tipAccounts;
        const randomIndex = Math.floor(Math.random() * tipAccounts.length);
        return new PublicKey(tipAccounts[randomIndex]);
    }

    createJitoTipInstruction(tipAccount) {
        return SystemProgram.transfer({
            fromPubkey: this.solanaClient.wallet.publicKey,
            toPubkey: tipAccount,
            lamports: this.solanaClient.config.jitoTipLamports,
        });
    }
}

export default AtomicExecutor;