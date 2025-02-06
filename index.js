import SolanaClient from './solana-client.js';
import ArbitrageStrategy from './arbitrage-strategy.js';
import logger from './logger.js';

class TradingBot {
    constructor() {
        this.solanaClient = new SolanaClient();
        this.arbitrageStrategy = null;
        this.isRunning = false;
    }

    async initialize() {
        logger.info('Initializing trading bot...');
        
        const connected = await this.solanaClient.connect();
        if (!connected) {
            throw new Error('Failed to connect wallet. Check your private key configuration.');
        }

        this.arbitrageStrategy = new ArbitrageStrategy(this.solanaClient);
        logger.info('Bot initialized successfully');
    }

    async start() {
        if (this.isRunning) {
            logger.warn('Bot is already running');
            return;
        }

        try {
            await this.initialize();
            
            this.isRunning = true;
            logger.info('Starting trading bot...');

            while (this.isRunning) {
                try {
                    // Monitor for arbitrage opportunities
                    const opportunity = await this.arbitrageStrategy.monitorArbitrageOpportunities();
                    
                    if (opportunity) {
                        logger.info('Found arbitrage opportunity:', opportunity);
                        
                        // Create and submit arbitrage transactions
                        const transactions = await this.arbitrageStrategy.createArbitrageTransactions(
                            opportunity.buyDex,
                            opportunity.sellDex,
                            'SOL',
                            'USDC',
                            1 // Amount to trade
                        );

                        // Submit bundle to Jito
                        const bundle = await this.solanaClient.createTradeBundle(transactions);
                        const result = await this.solanaClient.submitBundle(bundle);
                        
                        logger.info('Arbitrage executed:', result);
                    }

                    // Wait before next iteration
                    await new Promise(resolve => setTimeout(resolve, 1000));
                } catch (error) {
                    logger.error('Error in trading loop:', error);
                    await new Promise(resolve => setTimeout(resolve, 5000));
                }
            }
        } catch (error) {
            logger.error('Fatal error in bot:', error);
            this.stop();
        }
    }

    stop() {
        this.isRunning = false;
        logger.info('Stopping trading bot...');
    }
}

// Start the bot
const bot = new TradingBot();

// Handle shutdown gracefully
process.on('SIGINT', () => {
    logger.info('Received SIGINT. Shutting down...');
    bot.stop();
});

process.on('SIGTERM', () => {
    logger.info('Received SIGTERM. Shutting down...');
    bot.stop();
});

// Start the bot and handle any startup errors
bot.start().catch(error => {
    logger.error('Fatal error starting bot:', error);
    process.exit(1);
});