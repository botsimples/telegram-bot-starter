// models/Offer.js
const mongoose = require('mongoose');

const OfferSchema = new mongoose.Schema({
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin', // ou o nome do seu model de usuário
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },

  // Tipo de bot que o seller escolheu
  botType: {
    type: String,
    enum: ['bot_padrao', 'bot_fluxo_wiin', 'bot_fluxo_manychat'],
    default: 'bot_padrao'
  },

  // Tipo de traqueamento escolhido
  trackingType: {
    type: String,
    enum: ['fb_pixel', 'utmify_utmify_pixel', 'utmify_fb_pixel', 'track_proprio'],
    default: 'fb_pixel'
  },

  // Token do bot Telegram (opcional na criação)
  botToken: {
    type: String,
    default: null
  },

  telegramUsername: {
    type: String,
    default: null
  },

  status: {
    type: String,
    enum: ['incompleto', 'ativo', 'erro'],
    default: 'incompleto'
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Offer', OfferSchema);
