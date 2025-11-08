const mongoose = require("mongoose");

const botSchema = new mongoose.Schema({
  nome: String,
  token: String,
  username: String,
  ativo: { type: Boolean, default: true },
  gateways: [{ type: mongoose.Schema.Types.ObjectId, ref: "Gateway" }],
  settings: { type: mongoose.Schema.Types.ObjectId, ref: "Settings" },
  criadoEm: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Bot", botSchema);
