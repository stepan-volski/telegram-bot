require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

// Load the bot token from environment variables
const token = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

// In-memory storage for status and price (since Railway doesn't support persistent file system)
let statusData = {};

// Function to simulate reading status from memory
const readStatus = () => {
  return statusData;
};

// Function to simulate updating status in memory
const updateStatus = (status, price) => {
  statusData = { status, price };
};

// Handle the "/start" command
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, 'Welcome to the Telegram bot!');
});

// Handle the "/status" command to check price and calculate gain/loss
bot.onText(/\/status/, async (msg) => {
  const chatId = msg.chat.id;
  try {
    // Fetch the real Bitcoin price from CoinGecko API
    const response = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd');
    const currentPrice = response.data.bitcoin.usd;

    // Read the stored status and price from in-memory storage
    const statusData = readStatus();

    if (!statusData || !statusData.status) {
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
