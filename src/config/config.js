require("dotenv").config();

module.exports = {
  TELEGRAM_BOT_API: process.env.TELEGRAM_BOT_API,
  PORT: process.env.PORT || 8080,
  SERVER_URL: process.env.SERVER_URL || "http://localhost:8080",
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  OPEN_AI_KEY: process.env.OPEN_AI_KEY,
  DB_URL: process.env.DB_URL,
}
