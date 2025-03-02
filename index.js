require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");

const token = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

let priceWatchInterval;

const getStatus = () => {
  return {
    type: process.env.STATUS_TYPE,
    price: parseFloat(process.env.STATUS_PRICE)
  };
};

const setStatus = (type, price) => {
  process.env.STATUS_TYPE = type;
  process.env.STATUS_PRICE = price;
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
      const { type, price } = getStatus();

      if (!type || !price) {
        console.log("No transaction recorded.");
        return;
      }

      const priceChangePercentage = ((currentPrice - price) / price) * 100;
      
      if (Math.abs(priceChangePercentage) >= 5) {
        let message = "";
        if (type === "bought") {
          message = priceChangePercentage > 0
            ? `[GAIN] BTC gained ${priceChangePercentage.toFixed(2)}% from your purchase ($${price}) and is now $${currentPrice}.`
            : `[LOSS] BTC lost ${Math.abs(priceChangePercentage).toFixed(2)}% from your purchase ($${price}) and is now $${currentPrice}.`;
        } else {
          message = priceChangePercentage < 0
            ? `[GAIN] BTC dropped ${Math.abs(priceChangePercentage).toFixed(2)}% from your sale ($${price}) and is now $${currentPrice}.`
            : `[LOSS] BTC increased ${priceChangePercentage.toFixed(2)}% from your sale ($${price}) and is now $${currentPrice}.`;
        }

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
Welcome to the Telegram bot! Available commands:
  /start - Start the bot
  /p - Get current BTC price
  /s - Check your last BTC transaction
  /buy <price> - Record BTC purchase
  /sell <price> - Record BTC sale
  /startwatch - Monitor price changes
  /stopwatch - Stop monitoring
`;

  bot.sendMessage(chatId, welcomeMessage);
});

bot.onText(/\/buy (\d+(\.\d+)?)/, (msg, match) => {
  const chatId = msg.chat.id;
  const price = match[1];

  if (!price || isNaN(price)) {
    bot.sendMessage(chatId, "Please provide a valid price. Example: /b 45000");
    return;
  }

  try {
    setStatus("bought", price);
    bot.sendMessage(chatId, `Recorded BTC purchase at $${price}`);
  } catch (error) {
    bot.sendMessage(chatId, "Error processing buy command.");
  }
});

bot.onText(/\/sell (\d+(\.\d+)?)/, (msg, match) => {
  const chatId = msg.chat.id;
  const price = match[1];

  if (!price || isNaN(price)) {
    bot.sendMessage(chatId, "Please provide a valid price. Example: /sell 45000");
    return;
  }

  try {
    setStatus("sold", price);
    bot.sendMessage(chatId, `Recorded BTC sale at $${price}`);
  } catch (error) {
    bot.sendMessage(chatId, "Error processing sell command.");
  }
});

bot.onText(/\/p/, async (msg) => {
  const chatId = msg.chat.id;
  try {
    const response = await axios.get("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd");
    bot.sendMessage(chatId, `Current BTC price: $${response.data.bitcoin.usd}`);
  } catch (error) {
    bot.sendMessage(chatId, "Error fetching price.");
  }
});

bot.onText(/\/s/, async (msg) => {
  const chatId = msg.chat.id;
  try {
    const response = await axios.get("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd");
    const currentPrice = response.data.bitcoin.usd;
    const { type, price } = getStatus();

    if (!type || !price) {
      bot.sendMessage(chatId, "No transaction recorded.");
      return;
    }

    const priceChangePercentage = ((currentPrice - price) / price) * 100;
    let statusMessage = "";

    if (type === "bought") {
      statusMessage = `[STATUS] Bought BTC for $${price}. Change: ${priceChangePercentage.toFixed(2)}%. Current: $${currentPrice}.`;
    } else {
      statusMessage = `[STATUS] Sold BTC for $${price}. Change: ${priceChangePercentage.toFixed(2)}%. Current: $${currentPrice}.`;
    }

    bot.sendMessage(chatId, statusMessage);
  } catch (error) {
    bot.sendMessage(chatId, "Error fetching price.");
  }
});

bot.onText(/\/startwatch/, (msg) => {
  const chatId = msg.chat.id;
  startWatch();
  bot.sendMessage(chatId, "Started monitoring BTC price.");
});

bot.onText(/\/stopwatch/, (msg) => {
  const chatId = msg.chat.id;
  stopWatch();
  bot.sendMessage(chatId, "Stopped monitoring BTC price.");
});
