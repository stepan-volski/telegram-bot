require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");

const token = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });
const statusData = { status: "", price: 0 };

const updateStatus = (status, price) => {
  const numericPrice = parseFloat(price);
  statusData = { status, numericPrice };
};

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const welcomeMessage = `
Welcome to the Telegram bot! Here are the available commands:
/start - Start the bot and get a welcome message
/price - Get current BTC price
/status - Check the current status of your BTC purchase or sale
/bought <price> - Record the purchase price of Bitcoin
`;

  bot.sendMessage(chatId, welcomeMessage);
});

bot.onText(/\/bought (\d+(\.\d+)?)/, (msg, match) => {
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

bot.onText(/\/price/, async (msg) => {
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

bot.onText(/\/status/, async (msg) => {
  const chatId = msg.chat.id;
  try {
    const response = await axios.get(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd"
    );
    const currentPrice = response.data.bitcoin.usd;

    if (!statusData || !statusData.status) {
      bot.sendMessage(chatId, "No purchase or sale record found.");
      return;
    }

    const priceChangePercentage =
      ((currentPrice - statusData.price) / statusData.price) * 100;
    let statusMessage = "";

    if (statusData.status === "bought") {
      if (priceChangePercentage >= 0) {
        statusMessage = `[GAIN] You bought BTC for ${
          statusData.price
        }, since then it grew by ${priceChangePercentage.toFixed(
          2
        )}% and is now ${currentPrice}.`;
      } else {
        statusMessage = `[LOSS] You bought BTC for ${
          statusData.price
        }, since then it fell by ${Math.abs(priceChangePercentage).toFixed(
          2
        )}% and is now ${currentPrice}.`;
      }
    } else if (statusData.status === "sold") {
      if (priceChangePercentage >= 0) {
        statusMessage = `[LOSS] You sold BTC for ${
          statusData.price
        }, since then it grew by ${priceChangePercentage.toFixed(
          2
        )}% and is now ${currentPrice}.`;
      } else {
        statusMessage = `[GAIN] You sold BTC for ${
          statusData.price
        }, since then it fell by ${Math.abs(priceChangePercentage).toFixed(
          2
        )}% and is now ${currentPrice}.`;
      }
    }

    bot.sendMessage(chatId, statusMessage);
  } catch (error) {
    bot.sendMessage(chatId, "Sorry, I couldn't fetch the price at the moment.");
  }
});
