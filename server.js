const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

const TOKEN = process.env.TELEGRAM_TOKEN;
const API = `https://api.telegram.org/bot${TOKEN}`;

// === CONFIG WiinPay ===
const WIINPAY_API_KEY = process.env.WIINPAY_API_KEY;
const WEBHOOK_URL = "https://telegram-bot-starter.onrender.com/pix/webhook"; // pode deixar assim por enquanto

// rota padrão
app.get("/", (req, res) => res.send("Bot online ✅"));

// webhook do Telegram
app.post("/telegram-webhook", async (req, res) => {
  try {
    const update = req.body;

    // mensagem /start
    if (update.message && update.message.text === "/start") {
      const chatId = update.message.chat.id;
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

    // clique em botões
    if (update.callback_query) {
      const cq = update.callback_query;
      const chatId = cq.message.chat.id;
      const data = cq.data;

      if (data === "comprar_plano") {
        // === Cria pagamento na WiinPay ===
        const pagamento = await axios.post("https://api.wiinpay.com.br/payment/create", {
          api_key: WIINPAY_API_KEY,
          value: 9.90,
          name: "Cliente Telegram",
          email: "cliente@teste.com",
          description: "Plano VIP Telegram",
          webhook_url: WEBHOOK_URL,
        });

        const retorno = pagamento.data;
        console.log("Pagamento WiinPay:", retorno);

        // aqui você adapta se a API devolver o campo copiaecola / qrcode / link
        const codigoPix =
          retorno?.payment?.pixCopiaECola ||
          retorno?.pix?.code ||
          JSON.stringify(retorno, null, 2);

        await axios.post(`${API}/sendMessage`, {
          chat_id: chatId,
          text: `💰 *Pagamento via PIX gerado!*\n\nCopie e cole o código abaixo:\n\n\`${codigoPix}\``,
          parse_mode: "Markdown",
        });
      }

      // responde callback
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

// webhook Pix (opcional)
app.post("/pix/webhook", (req, res) => {
  console.log("Pagamento confirmado:", req.body);
  res.sendStatus(200);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Servidor rodando na porta", PORT));
