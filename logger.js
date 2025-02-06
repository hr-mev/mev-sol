import winston from 'winston';
import chalk from 'chalk';

// First install chalk:
// npm install chalk

const coloredFormat = winston.format.printf(({ level, message, timestamp }) => {
    let formattedMessage = message;
    let formattedTimestamp = chalk.gray(`[${timestamp}]`);

    // Color code for price information
    if (message.includes('Buy Price:')) {
        formattedMessage = message.replace(
            /Buy Price: ([\d.]+)/,
            `Buy Price: ${chalk.blue('$1')}`
        );
    }
    if (message.includes('Sell Price:')) {
        formattedMessage = message.replace(
            /Sell Price: ([\d.]+)/,
            `Sell Price: ${chalk.yellow('$1')}`
        );
    }
    if (message.includes('Spread:')) {
        const spreadMatch = message.match(/Spread: ([-\d.]+)%/);
        if (spreadMatch) {
            const spread = parseFloat(spreadMatch[1]);
            const coloredSpread = spread >= 0 ? 
                chalk.green(`${spread}%`) : 
                chalk.red(`${spread}%`);
            formattedMessage = message.replace(
                /Spread: [-\d.]+%/,
                `Spread: ${coloredSpread}`
            );
        }
    }

    // Color code for token names
    if (message.includes('Token')) {
        formattedMessage = chalk.cyan(message);
    }

    // Color code for confidence levels
    if (message.includes('Confidence:')) {
        const confidenceLevel = message.includes('high') ? 
            chalk.green('high') : 
            chalk.yellow('medium');
        formattedMessage = message.replace(
            /(high|medium)/,
            confidenceLevel
        );
    }

    // Special formatting for initialization and status messages
    if (message.includes('initialized') || message.includes('connected')) {
        formattedMessage = chalk.green(message);
    }
    if (message.includes('error') || message.includes('failed')) {
        formattedMessage = chalk.red(message);
    }

    // Add emoji indicators
    if (message.includes('Token')) {
        formattedMessage = '🪙 ' + formattedMessage;
    }
    if (message.includes('Balance:')) {
        formattedMessage = '💰 ' + formattedMessage;
    }
    if (message.includes('Spread:')) {
        formattedMessage = '📊 ' + formattedMessage;
    }

    return `${formattedTimestamp} ${formattedMessage}`;
});

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        coloredFormat
    ),
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.timestamp(),
                coloredFormat
            )
        }),
        new winston.transports.File({ 
            filename: 'error.log', 
            level: 'error',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            )
        }),
        new winston.transports.File({ 
            filename: 'combined.log',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            )
        })
    ]
});

export default logger;