const mongoose = require("mongoose");
const config = require("./config");

exports.connectDatabase = async () => {
  await mongoose.connect(config.DB_URL);
}
