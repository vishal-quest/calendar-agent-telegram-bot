const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    name: { type: String },
    accessToken: { type: String, required: true },
    refreshToken: { type: String, required: true },
    expiresIn: { type: Number, required: true },
    messages: { type: [], default: [] },
  },
  {
    timestamps: true,
  }
);

UserSchema.index({ userId: 1 });

const UserModel = mongoose.model("UserModel", UserSchema);

module.exports = UserModel;

