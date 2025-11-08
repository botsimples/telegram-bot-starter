import express from "express";
import mongoose from "mongoose";
import session from "express-session";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import axios from "axios";
import bodyParser from "body-parser";

import adminRoutes from "./models/admin.js";
import { gerarPixWiinPay } from "./integrations/wiinpay.js";

dotenv.config();

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// === CONFIGURAÇÕES BASE ===
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "painel-botsimples",
    resave: false,
    saveUninitialized: true,
  })
);

// === VARIÁVEIS GERAIS ===
const TOKEN = process.env.TELEGRAM_TOKEN;
const API = `https://api.telegram.org/bot${TOKEN}`;
const MONGO_URI = process.env.MONGO_URI;

// === CONEXÃO AO MONGO ===
mongoose
  .connect(MONGO_URI)
  .then(() => console.log("✅ MongoDB conectado com sucesso!"))
  .catch((err) => console.error("❌ Erro MongoDB:", err.message));

// === MAPA DE PAGAMENTOS PENDENTES ===
const pagamentosPendentes = new Map();

// === FUNÇÃO: Enviar mensagem Telegram ===
async function sendMessage(chatId, text, options = {}) {
  try {
    await axios.post(`${API}/sendMessage`, {
      chat_id: chatId,
      text,
      parse_mode: "HTML", // usa HTML seguro
      ...options,
    });
  } catch (err) {
    console.error("Erro ao enviar mensagem Telegram:", err.response?.data || err.message);
  }
}

// === FUNÇÃO: Apagar mensagens anteriores ===
async function deleteMessage(chatId, messageId) {
  try {
    await axios.post(`${API}/deleteMessage`, {
      chat_id: chatId,
      message_id: messageId,
    });
  } catch {
    // ignora erros
  }
}

// === WEBHOOK TELEGRAM ===
app.post(`/webhook/${TOKEN}`, async (req, res) => {
  try {
    const update = req.body;
    console.log("📩 Atualização recebida:", JSON.stringify(update, null, 2));

    const message = update.message;
    const callback = update.callback_query;
    const chatId = callback?.message?.chat?.id || message?.chat?.id;
    const data = callback?.data;
    const messageId = callback?.message?.message_id;

    if (!chatId) return res.sendStatus(200);

    // === COMANDO /start ===
    if (message?.text === "/start") {
      await sendMessage(
        chatId,
        `<b>🔥 Bem-vindo ao BotSimples!</b>\n\nEscolha uma opção abaixo 👇`,
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: "💳 Comprar Plano", callback_data: "comprar_plano" }],
              [{ text: "📢 Canal VIP", url: "https://t.me/seucanal" }],
            ],
          },
        }
      );
      return res.sendStatus(200);
    }

    // === BOTÃO: COMPRAR PLANO ===
    if (data === "comprar_plano") {
      await deleteMessage(chatId, messageId);
      await sendMessage(chatId, `<b>💳 Escolha o plano que deseja adquirir:</b>`, {
        reply_markup: {
          inline_keyboard: [[{ text: "Mensal — R$9.97", callback_data: "plano_9.97" }]],
        },
      });
    }

    // === SELECIONAR PLANO ===
    if (data?.startsWith("plano_")) {
      const valor = parseFloat(data.split("_")[1]);

      const ultimoPix = pagamentosPendentes.get(chatId);
      if (ultimoPix && Date.now() - ultimoPix < 60 * 1000) {
        await sendMessage(chatId, "⚠️ Você precisa aguardar <b>1 minuto</b> para gerar outro PIX.");
        return res.sendStatus(200);
      }

      pagamentosPendentes.set(chatId, Date.now());

      const pix = await gerarPixWiinPay(valor);
      if (!pix.success) {
        await sendMessage(chatId, "❌ Erro ao gerar pagamento via WiinPay. Tente novamente mais tarde.");
        return res.sendStatus(200);
      }

      // Mensagem 1: aviso
      await sendMessage(
        chatId,
        `<b>Toque no código PIX abaixo para copiar:</b>\n\n⚠️ <b>Atenção:</b> este código PIX tem validade de <b>30 minutos</b>.`
      );

      // Mensagem 2: código PIX separado
      await sendMessage(chatId, `<code>${pix.qr_code}</code>`);

      // Mensagem 3: lembrete + botões
      await sendMessage(
        chatId,
        `⏰ <b>Lembrete:</b> o pagamento via PIX tem validade de <b>30 minutos</b>.\n\n✅ Após efetuar o pagamento, se o sistema não reconhecer automaticamente, clique em <b>Verificar Pagamento</b>.\n\n⚠️ Ao realizar o pagamento, você declara estar ciente de que este é um produto digital de consumo imediato.`,
        {
          reply_markup: {
            inline_keyboard: [
              [
                { text: "✅ Verificar Pagamento", callback_data: `verificar_${pix.paymentId}` },
                { text: "📷 Ler QR Code", url: "https://pixcopiar.com.br/" },
              ],
              [{ text: "🆘 Suporte", url: process.env.DEFAULT_SUPPORT_URL || "https://t.me/suporte" }],
            ],
          },
        }
      );
    }

    // === BOTÃO: VERIFICAR PAGAMENTO ===
    if (data?.startsWith("verificar_")) {
      const paymentId = data.split("_")[1];
      try {
        const response = await axios.get(`https://api-v2.wiinpay.com.br/v1/pix/${paymentId}`, {
          headers: { Authorization: `Bearer ${process.env.WIINPAY_API_KEY}` },
        });

        const status = response.data?.data?.status;
        if (status === "PAID") {
          await sendMessage(chatId, "🎉 <b>Pagamento confirmado!</b>\nSeu acesso foi liberado automaticamente.");
        } else {
          await sendMessage(chatId, "⏳ Pagamento ainda <b>não</b> foi confirmado.\nTente novamente em alguns segundos.");
        }
      } catch (error) {
        await sendMessage(chatId, "❌ Erro ao verificar pagamento, tente novamente mais tarde.");
      }
    }

    res.sendStatus(200);
  } catch (err) {
    console.error("🔥 Erro no webhook Telegram:", err);
    res.sendStatus(500);
  }
});

// === ROTAS DO PAINEL ===
app.use("/", adminRoutes);

// === INICIAR SERVIDOR ===
const PORT = process.env.PORT || 10000;
app.listen(PORT, "0.0.0.0", () => console.log(`🚀 Servidor rodando na porta ${PORT}`));
