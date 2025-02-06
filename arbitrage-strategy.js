import { PublicKey } from '@solana/web3.js';
import Decimal from 'decimal.js';
import logger from './logger.js';

class ArbitrageStrategy {
    constructor(solanaClient) {
        this.solanaClient = solanaClient;
        this.minProfitThreshold = 0.0025; // 0.15% minimum profit (adjustable)
        this.tradeAmount = 50; // Trade 50 USDC worth (adjust based on liquidity)
        this.tokens = {
            SOL: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
            USDC: 'GFcEXBFqng9MXkSCojwYhnnCksQyDxPigd3Vz9y2pump',
            JUP: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN'
        };
        this.jupiterPriceUrl = 'https://api.jup.ag/price/v2';
    }

    async fetchPrices(tokenIds) {
        try {
            const url = `${this.jupiterPriceUrl}?ids=${tokenIds.join(',')}&showExtraInfo=true`;
            logger.info(`Fetching prices from: ${url}`);

            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            if (data && data.data) {
                logger.info('✅ Price data received');
                return data.data;
            }

            throw new Error('Invalid price data structure');
        } catch (error) {
            logger.error('❌ Error fetching prices:', error.message);
            return null;
        }
    }

    async monitorArbitrageOpportunities() {
        try {
            const tokenIds = [this.tokens.SOL, this.tokens.USDC, this.tokens.JUP];
            const priceData = await this.fetchPrices(tokenIds);

            if (!priceData) {
                logger.warn('⚠️ Unable to fetch price data');
                return null;
            }

            let bestOpportunity = null;

            for (const tokenId of tokenIds) {
                const tokenPrice = priceData[tokenId];
                if (tokenPrice && tokenPrice.extraInfo) {
                    const { quotedPrice, confidenceLevel } = tokenPrice.extraInfo;
                    
                    if (quotedPrice) {
                        const buyPrice = new Decimal(quotedPrice.buyPrice);
                        const sellPrice = new Decimal(quotedPrice.sellPrice);
                        const spread = sellPrice.minus(buyPrice).dividedBy(buyPrice);
                        
                        logger.info(`🪙 Token ${tokenId}:`);
                        logger.info(`   - Buy Price: ${buyPrice}`);
                        logger.info(`   - Sell Price: ${sellPrice}`);
                        logger.info(`   - Spread: ${spread.times(100)}%`);
                        logger.info(`   - Confidence: ${confidenceLevel}`);

                        // ✅ Execute Trade if Spread > Threshold
                        if (spread.greaterThan(this.minProfitThreshold) && confidenceLevel === 'high') {
                            logger.info(`🚀 Profitable Arbitrage Opportunity Found for ${tokenId}`);
                            logger.info(`   ✅ Spread: ${spread.times(100).toFixed(4)}%`);
                            logger.info(`   ✅ Executing Trade...`);

                            bestOpportunity = {
                                token: tokenId,
                                buyPrice: buyPrice.toString(),
                                sellPrice: sellPrice.toString(),
                                profitPercentage: spread.times(100).toFixed(4),
                                confidence: confidenceLevel
                            };
                        }
                    }
                }
            }

            return bestOpportunity;
        } catch (error) {
            logger.error('❌ Error monitoring arbitrage opportunities:', error);
            return null;
        }
    }
}

export default ArbitrageStrategy;
