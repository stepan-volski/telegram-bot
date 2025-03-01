require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");

const token = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

let priceWatchInterval;

const getBoughtPrice = () => {
  return parseFloat(process.env.BOUGHT_PRICE);
};

const setBoughtPrice = (price) => {
  process.env.BOUGHT_PRICE = price;
};

const updateStatus = (status, price) => {
  setBoughtPrice(price);
};

const startWatch = () => {
  if (priceWatchInterval) {
    return;
  }

  priceWatchInterval = setInterval(async () => {
    try {
      const response = await axios.get(
        "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd"
      );
      const currentPrice = response.data.bitcoin.usd;
      const boughtPrice = getBoughtPrice();
      
      if (!boughtPrice) {
        console.log("No bought price set.");
        return;
      }

      const priceChangePercentage = ((currentPrice - boughtPrice) / boughtPrice) * 100;
      
      // If price changes by more than 5%
      if (Math.abs(priceChangePercentage) >= 5) {
        const message = priceChangePercentage > 0
          ? `[GAINING] Current BTC price gained ${priceChangePercentage.toFixed(2)}% from your purchase ($${boughtPrice}) and is now $${currentPrice}.`
          : `[LOSING] Current BTC price lost ${Math.abs(priceChangePercentage).toFixed(2)}% from your purchase ($${boughtPrice}) and is now $${currentPrice}.`;

        bot.sendMessage(process.env.CHAT_ID, message);
      }
    } catch (error) {
      console.error("Error fetching BTC price:", error);
    }
  }, 60 * 60 * 1000); // Every hour
};

const stopWatch = () => {
  if (priceWatchInterval) {
    clearInterval(priceWatchInterval);
    priceWatchInterval = null;
    console.log("Stopped monitoring the BTC price.");
  }
};

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  process.env.CHAT_ID = chatId;
  
  const welcomeMessage = `
Welcome to the Telegram bot! Here are the available commands:
  /start - Start the bot and get a welcome message
  /p - Get current BTC price
  /s - Check the current status of your BTC purchase or sale
  /b <price> - Record the purchase price of Bitcoin
  /startwatch - Start monitoring the price change (every 1 hour)
  /stopwatch - Stop monitoring the price change
`;

  bot.sendMessage(chatId, welcomeMessage);
});

bot.onText(/\/b (\d+(\.\d+)?)/, (msg, match) => {
  const chatId = msg.chat.id;
  const price = match[1];

  // Check if the price is a valid number
  if (!price || isNaN(price)) {
    bot.sendMessage(
      chatId,
      "Please provide a valid number as the price. Example: /bought 45000"
    );
    return;
  }

  try {
    updateStatus("bought", price);
    bot.sendMessage(chatId, `Recorded purchase of BTC at $${price}`);
  } catch (error) {
    bot.sendMessage(chatId, "Sorry, I couldn't process your buy command.");
  }
});

bot.onText(/\/p/, async (msg) => {
  const chatId = msg.chat.id;
  try {
    const response = await axios.get(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd"
    );
    const message = `The current BTC price is ${response.data.bitcoin.usd} usd`;

    bot.sendMessage(chatId, message);
  } catch (error) {
    bot.sendMessage(chatId, "Sorry, I couldn't fetch the price at the moment.");
  }
});

bot.onText(/\/s/, async (msg) => {
  const chatId = msg.chat.id;
  try {
    const response = await axios.get(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd"
    );
    const currentPrice = response.data.bitcoin.usd;

    const boughtPrice = getBoughtPrice();

    if (!boughtPrice) {
      bot.sendMessage(chatId, "No purchase or sale record found.");
      return;
    }

    const priceChangePercentage =
      ((currentPrice - boughtPrice) / boughtPrice) * 100;

    let statusMessage = "";
    if (priceChangePercentage >= 0) {
      statusMessage = `[GAIN] You bought BTC for $${boughtPrice}, since then it grew by ${priceChangePercentage.toFixed(
        2
      )}% and is now ${currentPrice}.`;
    } else {
      statusMessage = `[LOSS] You bought BTC for $${boughtPrice}, since then it fell by ${Math.abs(priceChangePercentage).toFixed(
        2
      )}% and is now ${currentPrice}.`;
    }

    bot.sendMessage(chatId, statusMessage);
  } catch (error) {
    bot.sendMessage(chatId, "Sorry, I couldn't fetch the price at the moment.");
  }
});

bot.onText(/\/startwatch/, (msg) => {
  const chatId = msg.chat.id;
  startWatch();
  bot.sendMessage(chatId, "Started monitoring the BTC price every hour.");
});

bot.onText(/\/stopwatch/, (msg) => {
  const chatId = msg.chat.id;
  stopWatch();
  bot.sendMessage(chatId, "Stopped monitoring the BTC price.");
});
