const express = require("express");
const axios = require("axios");
const mongoose = require("mongoose");
require("dotenv").config();

const app = express();
app.use(express.json());

// === VARIÁVEIS ===
const TOKEN = process.env.TELEGRAM_TOKEN;
const API = `https://api.telegram.org/bot${TOKEN}`;
const WIINPAY_API_KEY = process.env.WIINPAY_API_KEY;
const MONGO_URI = process.env.MONGO_URI;

// === CONECTAR AO MONGO ===
mongoose.connect(MONGO_URI)
  .then(() => console.log("✅ MongoDB conectado com sucesso!"))
  .catch(err => console.error("Erro ao conectar ao MongoDB:", err));

// === MODELOS ===
const User = mongoose.model("User", new mongoose.Schema({
  telegramId: Number,
  username: String,
  firstName: String,
  lastName: String,
  dateJoined: { type: Date, default: Date.now },
}));

const Payment = mongoose.model("Payment", new mongoose.Schema({
  telegramId: Number,
  paymentId: String,
  amount: Number,
  status: { type: String, default: "pending" },
  date: { type: Date, default: Date.now },
}));

// === ROTA PADRÃO ===
app.get("/", (req, res) => res.send("Bot online ✅"));

// === WEBHOOK TELEGRAM ===
app.post("/telegram-webhook", async (req, res) => {
  try {
    const update = req.body;

    // /start
    if (update.message && update.message.text === "/start") {
      const chatId = update.message.chat.id;
      const user = update.message.from;

      // salva usuário no banco (só se for novo)
      await User.findOneAndUpdate(
        { telegramId: user.id },
        {
          telegramId: user.id,
          username: user.username,
          firstName: user.first_name,
          lastName: user.last_name,
        },
        { upsert: true, new: true }
      );

      const caption = "🔥 *Bem-vindo!*\n\nEscolha uma opção abaixo 👇";

      const keyboard = {
        inline_keyboard: [
          [{ text: "💳 Comprar Plano", callback_data: "comprar_plano" }],
          [{ text: "📢 Canal VIP", url: "https://t.me/seucanal" }],
        ],
      };

      await axios.post(`${API}/sendPhoto`, {
        chat_id: chatId,
        photo: "https://i.imgur.com/NnZXOqK.png",
        caption,
        parse_mode: "Markdown",
        reply_markup: keyboard,
      });
    }

    // CALLBACK BUTTON
    if (update.callback_query) {
      const cq = update.callback_query;
      const chatId = cq.message.chat.id;
      const data = cq.data;

      if (data === "comprar_plano") {
        const pagamento = await axios.post("https://api.wiinpay.com.br/payment/create", {
          api_key: WIINPAY_API_KEY,
          value: 9.90,
          name: "Cliente Telegram",
          email: "cliente@teste.com",
          description: "Plano VIP Telegram",
          webhook_url: "https://telegram-bot-starter.onrender.com/pix/webhook",
        });

        const retorno = pagamento.data;
        const codigoPix = retorno?.pix?.code || JSON.stringify(retorno, null, 2);

        // salva pagamento
        await Payment.create({
          telegramId: chatId,
          paymentId: retorno.data?.paymentId || "none",
          amount: 9.9,
        });

        await axios.post(`${API}/sendMessage`, {
          chat_id: chatId,
          text: `💰 *Pagamento via PIX gerado com sucesso!*\n\nCopie o código abaixo e cole no seu banco para pagar:\n\n\`${codigoPix}\`\n\n⚡ Assim que o pagamento for confirmado, seu acesso será liberado automaticamente.`,
          parse_mode: "Markdown",
        });
      }

      await axios.post(`${API}/answerCallbackQuery`, {
        callback_query_id: cq.id,
      });
    }

    res.sendStatus(200);
  } catch (err) {
    console.error("Erro:", err?.response?.data || err.message);
    res.sendStatus(200);
  }
});

// === WEBHOOK DE PAGAMENTO (confirmação automática) ===
app.post("/pix/webhook", async (req, res) => {
  try {
    const body = req.body;
    const paymentId = body?.data?.paymentId;

    if (paymentId) {
      await Payment.findOneAndUpdate({ paymentId }, { status: "paid" });
      console.log("Pagamento confirmado:", paymentId);
    }

    res.sendStatus(200);
  } catch (err) {
    console.error("Erro no webhook:", err.message);
    res.sendStatus(200);
  }
});

// === INICIAR SERVIDOR ===
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Servidor rodando na porta ${PORT}`));
