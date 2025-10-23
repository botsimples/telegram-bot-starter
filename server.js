const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

const TOKEN = process.env.TELEGRAM_TOKEN; // você vai configurar isso no Render
const API = `https://api.telegram.org/bot${TOKEN}`;

// Rota de saúde (Render usa para checar se está tudo ok)
app.get("/", (req, res) => {
  res.send("Bot online ✅");
});

// Webhook do Telegram (a URL final será: https://SEU-SERVICO.onrender.com/telegram-webhook)
app.post("/telegram-webhook", async (req, res) => {
  try {
    const update = req.body;

    // Mensagem digitada (/start)
    if (update.message && update.message.text) {
      const chatId = update.message.chat.id;
      const text = update.message.text.trim();

      if (text === "/start") {
        // Conteúdo do /start — copy + mídia + botões
        const caption =
          "🔥 *Bem-vindo!*\\n\\n" +
          "Aqui vai sua copy de apresentação. Escolha uma opção abaixo 👇";

        const keyboard = {
          inline_keyboard: [
            [{ text: "💳 Comprar Plano", callback_data: "comprar_plano" }],
            [{ text: "📢 Canal VIP", url: "https://t.me/seucanal" }]
          ]
        };

        // Enviar foto com legenda + botões (use um link direto de imagem)
        await axios.post(`${API}/sendPhoto`, {
          chat_id: chatId,
          photo: "https://i.imgur.com/NnZXOqK.png",
          caption,
          parse_mode: "Markdown",
          reply_markup: keyboard
        });
      }
    }

    // Clique em botão (callback_query)
    if (update.callback_query) {
      const cq = update.callback_query;
      const chatId = cq.message.chat.id;
      const data = cq.data; // ex: "comprar_plano"

      if (data === "comprar_plano") {
        // Aqui futuramente chamaremos sua API Pix e retornaremos o código/QR
        await axios.post(`${API}/sendMessage`, {
          chat_id: chatId,
          text:
            "💰 *Pagamento via PIX*\\n\\n" +
            "Exemplo de resposta. No próximo passo vamos conectar sua API Pix.",
          parse_mode: "Markdown"
        });
      }

      // Responde o callback para remover o “loading” no Telegram
      await axios.post(`${API}/answerCallbackQuery`, {
        callback_query_id: cq.id
      });
    }

    res.sendStatus(200);
  } catch (err) {
    console.error("Erro no webhook:", err?.response?.data || err.message);
    res.sendStatus(200); // sempre 200 para o Telegram não repetir
  }
});

// Porta dinâmica (Render define PORT)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Servidor iniciado na porta", PORT);
});
