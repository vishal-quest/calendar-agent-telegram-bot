const TelegramBot = require('node-telegram-bot-api');
const config = require('./config/config');
const express = require("express");
const path = require("node:path");
const GoogleService = require('./services/google');
const { connectDatabase } = require('./config/database');
const UserModel = require('./models/user');
const UtilService = require('./services/util');
const ChatService = require('./services/chat');

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(config.TELEGRAM_BOT_API, { polling: true });
const app = express();
const googleService = new GoogleService();
const utilService = new UtilService();
const chatService = new ChatService(utilService, googleService)

bot.setMyCommands([
  {
    command: "auth",
    description: "Authenticate with google account",
  }
]);

// Matches "/echo [whatever]"
bot.onText(/\/echo (.+)/, (msg, match) => {
  // 'msg' is the received Message from Telegram
  // 'match' is the result of executing the regexp above on the text content
  // of the message

  const chatId = msg.chat.id;
  const resp = match[1]; // the captured "whatever"

  // send back the matched "whatever" to the chat
  bot.sendMessage(chatId, resp);
});

bot.onText(/\/auth/, (msg) => {
  const chatId = msg.chat.id;

  const googleOauthScopes = [
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
    "https://www.googleapis.com/auth/calendar.events",
    "https://www.googleapis.com/auth/calendar",
  ];

  bot.sendMessage(chatId, "Click on this button to authenticate with google", {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "Authenticate",
            url: `https://accounts.google.com/o/oauth2/v2/auth?scope=${googleOauthScopes.join("+")}&access_type=offline&prompt=consent&include_granted_scopes=true&response_type=code&state=state_parameter_passthrough_value&redirect_uri=${config.SERVER_URL}&client_id=${config.GOOGLE_CLIENT_ID}`,
          }
        ]
      ]
    }
  });
});

bot.onText(/\/token/, async (msg) => {
  const chatId = msg.chat.id;
  const code = msg.text.split("/token")[1].trim();

  if (!code) {
    bot.sendMessage(chatId, "Please paste a token following the command");
    return;
  }

  bot.sendMessage(chatId, `Processing token ${code}`);

  const getAccessTokenResponse = await googleService.getAccessToken(code);

  if (!getAccessTokenResponse?.success) {
    bot.sendMessage(chatId, "Unable to get access token, please try again");
    return;
  }

  await UserModel.updateOne(
    {
      userId: chatId,
    },
    {
      accessToken: getAccessTokenResponse.data.accessToken,
      refreshToken: getAccessTokenResponse.data.refreshToken,
      expiresIn: getAccessTokenResponse.data.expiresIn,
      name: msg?.from?.first_name,
    },
    {
      upsert: true,
    }
  );

  bot.sendMessage(chatId, "Token saved successfully");
});

// Listen for any kind of message. There are different kinds of
// messages.
bot.on('message', async (msg) => {
  if (msg.text.startsWith("/")) return;

  const chatId = msg.chat.id;

  // bot.sendMessage(chatId, `Welcome, ${user?.name || "User"}`);
  const chatResponse = await chatService.chat(chatId, msg.text, msg.date);

  if (chatResponse.success) {
    bot.sendMessage(chatId, chatResponse.message);
    return;
  }

  bot.sendMessage(chatId, "Unable to process request");
});

app.use(express.static(path.join(__dirname, "/public")));

app.listen(config.PORT, async () => {
  console.log("Telegram server is listening on port", config.PORT);
  await connectDatabase();
  console.log("Database connected");
});
