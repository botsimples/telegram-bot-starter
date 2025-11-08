import express from "express";
import mongoose from "mongoose";
import session from "express-session";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import axios from "axios";
import bodyParser from "body-parser";

import adminRoutes from "./models/admin.js";
import { gerarPixWiinPay, verificarPixWiinPay } from "./integrations/wiinpay.js";

dotenv.config();

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

// === MAPAS DE CONTROLE ===
const mensagensPorChat = new Map();
const pagamentosPendentes = new Map();
const qrsGerados = new Map();

// === FUNÇÃO: Enviar mensagem ===
async function sendMessage(chatId, text, options = {}) {
  try {
    const res = await axios.post(`${API}/sendMessage`, {
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      ...options,
    });
    const msgId = res.data?.result?.message_id;
    if (msgId) {
      if (!mensagensPorChat.has(chatId)) mensagensPorChat.set(chatId, []);
      mensagensPorChat.get(chatId).push(msgId);
    }
    return msgId;
  } catch (err) {
    console.error("Erro ao enviar mensagem Telegram:", err.response?.data || err.message);
  }
}

// === FUNÇÃO: Apagar TODAS as mensagens anteriores ===
async function limparMensagens(chatId) {
  const lista = mensagensPorChat.get(chatId);
  if (!lista) return;
  for (const msgId of lista) {
    try {
      await axios.post(`${API}/deleteMessage`, {
        chat_id: chatId,
        message_id: msgId,
      });
    } catch {}
  }
  mensagensPorChat.set(chatId, []);
}

// === FUNÇÃO: Enviar imagem QR ===
async function sendQrCode(chatId, qrData) {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrData)}`;
  try {
    await axios.post(`${API}/sendPhoto`, {
      chat_id: chatId,
      photo: qrUrl,
      caption: "📷 Escaneie o QR Code acima ou copie o código PIX abaixo 👇",
      parse_mode: "HTML",
    });
  } catch (err) {
    console.error("Erro ao enviar QR Code:", err.response?.data || err.message);
  }
}

// === WEBHOOK TELEGRAM ===
app.post(`/webhook/${TOKEN}`, async (req, res) => {
  try {
    const update = req.body;
    console.log("📩 Atualização recebida:", JSON.stringify(update, null, 2));

    const message = update.message;
    const callback = update.callback_query;
    const chatId = message?.chat?.id || callback?.message?.chat?.id;
    const data = callback?.data;
    if (!chatId) return res.sendStatus(200);

    // === /start ===
    if (message?.text === "/start") {
      await limparMensagens(chatId);
      await sendMessage(chatId, "🔥 <b>Bem-vindo ao BotSimples!</b>");
      await sendMessage(chatId, "Escolha uma opção abaixo 👇", {
        reply_markup: {
          inline_keyboard: [
            [{ text: "💳 Comprar Plano", callback_data: "comprar_plano" }],
            [{ text: "📢 Canal VIP", url: "https://t.me/seucanal" }],
          ],
        },
      });
      return res.sendStatus(200);
    }

    // === Comprar Plano ===
    if (data === "comprar_plano") {
      await limparMensagens(chatId);

      const Plan = mongoose.models.Plan || mongoose.model("Plan", new mongoose.Schema({
        name: String,
        price: Number,
        description: String,
      }));
      const planos = await Plan.find();

      if (!planos.length) {
        await sendMessage(chatId, "⚠️ Nenhum plano disponível no momento.");
        return res.sendStatus(200);
      }

      const botoes = planos.map(p => [
        { text: `${p.name} — R$${p.price.toFixed(2)}`, callback_data: `plano_${p.price}` },
      ]);

      await sendMessage(chatId, "💳 <b>Escolha o plano que deseja adquirir:</b>", {
        reply_markup: { inline_keyboard: botoes },
      });
    }

    // === Selecionar Plano ===
    if (data?.startsWith("plano_")) {
      await limparMensagens(chatId);

      const valor = parseFloat(data.split("_")[1]);
      const pix = await gerarPixWiinPay(valor);

      if (!pix.success) {
        await sendMessage(chatId, "❌ Erro ao gerar pagamento via WiinPay.");
        return res.sendStatus(200);
      }

      qrsGerados.set(chatId, pix.qr_code); // Salva QR para o botão
      pagamentosPendentes.set(chatId, pix.paymentId);

      await sendMessage(chatId, "💰 <b>Toque no código PIX abaixo para copiar:</b>\n⚠️ Este código tem validade de 30 minutos.");
      await sendMessage(chatId, `<code>${pix.qr_code}</code>`);

      await sendMessage(
        chatId,
        "⏰ Lembrete: o pagamento via PIX tem validade de 30 minutos.\n\n" +
        "✅ Após efetuar o pagamento, se o sistema não reconhecer automaticamente, clique em <b>Verificar Pagamento</b>.\n\n" +
        "⚠️ Ao realizar o pagamento, você declara estar ciente de que este é um produto digital de consumo imediato.",
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: "📷 Ver QR Code", callback_data: "mostrar_qr" }],
              [{ text: "🔍 Verificar Pagamento", callback_data: "verificar_pagamento" }],
              [{ text: "🆘 Suporte", url: process.env.DEFAULT_SUPPORT_URL || "https://t.me/suporte" }],
            ],
          },
        }
      );
    }

    // === Mostrar QR Code ===
    if (data === "mostrar_qr") {
      const qr = qrsGerados.get(chatId);
      if (qr) await sendQrCode(chatId, qr);
    }

    // === Verificar Pagamento ===
    if (data === "verificar_pagamento") {
      const paymentId = pagamentosPendentes.get(chatId);
      if (!paymentId) {
        await sendMessage(chatId, "⚠️ Nenhum pagamento pendente encontrado.");
        return res.sendStatus(200);
      }

      const status = await verificarPixWiinPay(paymentId);
      if (status.success && status.status === "PAID") {
        await sendMessage(chatId, "🎉 <b>Pagamento confirmado!</b>\nSeu acesso foi liberado automaticamente.");
      } else {
        await sendMessage(chatId, "⏳ Pagamento ainda não confirmado. Tente novamente em alguns segundos.");
      }
    }

    res.sendStatus(200);
  } catch (err) {
    console.error("🔥 Erro no webhook Telegram:", err);
    res.sendStatus(500);
  }
});

app.use("/", adminRoutes);

const PORT = process.env.PORT || 10000;
app.listen(PORT, "0.0.0.0", () => console.log(`🚀 Servidor rodando na porta ${PORT}`));
