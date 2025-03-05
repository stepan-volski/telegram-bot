require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");

const token = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

let priceWatchInterval;

const getStatus = () => {
  return {
    type: process.env.STATUS_TYPE,
    price: parseFloat(process.env.STATUS_PRICE),
  };
};

const setStatus = (type, price) => {
  process.env.STATUS_TYPE = type;
  process.env.STATUS_PRICE = price;
};

async function getCurrentPrice() {
  const response = await axios.get(
    "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd"
  );
  return response.data.bitcoin.usd;
}

async function getStatusMessage() {
  try {
    const currentPrice = await getCurrentPrice();
    const { type, price } = getStatus();

    if (!type || !price) {
      return "No transaction recorded.";
    }

    const priceChangePercentage = ((currentPrice - price) / price) * 100;

    return `[${priceChangePercentage.toFixed(
      2
    )}%] ${type}: $${price}. Current: $${currentPrice}.`;
  } catch (error) {
    return "Error fetching price.";
  }
}

const startWatch = (chatId) => {
  if (priceWatchInterval) {
    return;
  }

  priceWatchInterval = setInterval(async () => {
    try {
      const { price } = getStatus();
      const currentPrice = await getCurrentPrice();
      const priceChangePercentage = ((currentPrice - price) / price) * 100;

      if (Math.abs(priceChangePercentage) >= 5) {
        const message = await getStatusMessage();
        bot.sendMessage(chatId, message);
      }
    } catch (error) {
      console.error("Error fetching BTC price:", error);
    }
  }, 60 * 60 * 1000); // Every 60 min
};

const stopWatch = () => {
  if (priceWatchInterval) {
    clearInterval(priceWatchInterval);
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
    setStatus("Bought", price);
    bot.sendMessage(chatId, `Recorded BTC purchase at $${price}`);
  } catch (error) {
    bot.sendMessage(chatId, "Error processing buy command.");
  }
});

bot.onText(/\/sell (\d+(\.\d+)?)/, (msg, match) => {
  const chatId = msg.chat.id;
  const price = match[1];

  if (!price || isNaN(price)) {
    bot.sendMessage(
      chatId,
      "Please provide a valid price. Example: /sell 45000"
    );
    return;
  }

  try {
    setStatus("Sold", price);
    bot.sendMessage(chatId, `Recorded BTC sale at $${price}`);
  } catch (error) {
    bot.sendMessage(chatId, "Error processing sell command.");
  }
});

bot.onText(/\/p/, async (msg) => {
  const chatId = msg.chat.id;
  try {
    const price = await getCurrentPrice();
    bot.sendMessage(chatId, `Current BTC price: $${price}`);
  } catch (error) {
    bot.sendMessage(chatId, "Error fetching price.");
  }
});

bot.onText(/\/s/, async (msg) => {
  const chatId = msg.chat.id;
  try {
    const { type, price } = getStatus();

    if (!type || !price) {
      bot.sendMessage(chatId, "No transaction recorded.");
      return;
    }

    const message = await getStatusMessage();

    bot.sendMessage(chatId, message);
  } catch (error) {
    bot.sendMessage(chatId, "Error fetching price.");
  }
});

bot.onText(/\/startwatch/, (msg) => {
  const chatId = msg.chat.id;
  startWatch(msg.chat.id);
  bot.sendMessage(chatId, "Started monitoring BTC price.");
});

bot.onText(/\/stopwatch/, (msg) => {
  const chatId = msg.chat.id;
  stopWatch();
  bot.sendMessage(chatId, "Stopped monitoring BTC price.");
});
