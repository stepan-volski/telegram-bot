require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const fs = require('fs');

// Load the bot token from environment variables
const token = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

// File path to store the status and price
const statusFile = 'status.json';

// Function to read status from the file
const readStatus = () => {
  try {
    const data = fs.readFileSync(statusFile);
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading status file:', err);
    return null;
  }
};

// Function to update status in the file
const updateStatus = (status, price) => {
  const statusData = { status, price };
  fs.writeFileSync(statusFile, JSON.stringify(statusData, null, 2), 'utf-8');
};

// Handle the "/start" command
bot.onText('Start', (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, 'Welcome to the Telegram bot!');
});

// Handle the "/status" command to check price and calculate gain/loss
bot.onText('Status', async (msg) => {
  const chatId = msg.chat.id;
  try {
    // Fetch the real Bitcoin price from CoinGecko API
    const response = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd');
    const currentPrice = response.data.bitcoin.usd;

    // Read the stored status and price
    const statusData = readStatus();

    if (!statusData) {
      bot.sendMessage(chatId, 'No purchase or sale record found.');
      return;
    }

    const { status, price } = statusData;

    // Calculate the percentage change
    const priceChangePercentage = ((currentPrice - price) / price) * 100;
    let message = '';
    let statusMessage = '';

    if (status === 'bought') {
      if (priceChangePercentage >= 0) {
        statusMessage = `[GAIN] You bought BTC for ${price}, since then it grew by ${priceChangePercentage.toFixed(2)}% and is now ${currentPrice}.`;
      } else {
        statusMessage = `[LOSS] You bought BTC for ${price}, since then it fell by ${Math.abs(priceChangePercentage).toFixed(2)}% and is now ${currentPrice}.`;
      }
    } else if (status === 'sold') {
      if (priceChangePercentage >= 0) {
        statusMessage = `[LOSS] You sold BTC for ${price}, since then it grew by ${priceChangePercentage.toFixed(2)}% and is now ${currentPrice}.`;
      } else {
        statusMessage = `[GAIN] You sold BTC for ${price}, since then it fell by ${Math.abs(priceChangePercentage).toFixed(2)}% and is now ${currentPrice}.`;
      }
    }

    bot.sendMessage(chatId, statusMessage);

  } catch (error) {
    // Send an error message if the API call fails
    console.error('Error fetching Bitcoin price:', error);
    bot.sendMessage(chatId, 'Sorry, I couldn\'t fetch the price at the moment.');
  }
});

