import express from "express";
import mongoose from "mongoose";
import session from "express-session";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import axios from "axios";
import bodyParser from "body-parser";

import adminRoutes from "./models/admin.js";
import Plan from "./models/Plan.js";
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

// === VARIÁVEIS ===
const TOKEN = process.env.TELEGRAM_TOKEN;
const API = `https://api.telegram.org/bot${TOKEN}`;
const MONGO_URI = process.env.MONGO_URI;

// === CONEXÃO ===
mongoose
  .connect(MONGO_URI)
  .then(() => console.log("✅ MongoDB conectado com sucesso!"))
  .catch((err) => console.error("❌ Erro MongoDB:", err.message));

// === MAPAS DE CONTROLE ===
const mensagensPorChat = new Map();
const pagamentosPendentes = new Map();
const qrsGerados = new Map();
const planoPorChat = new Map();

// === FUNÇÕES TELEGRAM ===
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

async function sendVideoInicial(chatId) {
  const videoUrl = "https://t.me/gustavoisp2/30";
  try {
    const res = await axios.post(`${API}/sendVideo`, {
      chat_id: chatId,
      video: videoUrl,
      caption: "🔥 <b>Bem-vindo ao BotSimples!</b>",
      parse_mode: "HTML",
    });
    const msgId = res.data?.result?.message_id;
    if (msgId) {
      if (!mensagensPorChat.has(chatId)) mensagensPorChat.set(chatId, []);
      mensagensPorChat.get(chatId).push(msgId);
    }
  } catch (err) {
    console.error("Erro ao enviar vídeo inicial:", err.response?.data || err.message);
  }
}

async function sendQrCode(chatId, qrData) {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrData)}`;
  try {
    const res = await axios.post(`${API}/sendPhoto`, {
      chat_id: chatId,
      photo: qrUrl,
      caption: "📷 Escaneie o QR Code acima para efetuar o pagamento.",
      parse_mode: "HTML",
    });
    const msgId = res.data?.result?.message_id;
    if (msgId) {
      if (!mensagensPorChat.has(chatId)) mensagensPorChat.set(chatId, []);
      mensagensPorChat.get(chatId).push(msgId);
    }
  } catch (err) {
    console.error("Erro ao enviar QR Code:", err.response?.data || err.message);
  }
}

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
  qrsGerados.delete(chatId);
  pagamentosPendentes.delete(chatId);
  planoPorChat.delete(chatId);
}

// === WEBHOOK ===
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
      await sendVideoInicial(chatId);
      await sendMessage(chatId, "Escolha uma opção abaixo 👇", {
        reply_markup: {
          inline_keyboard: [
            [{ text: "💳 Comprar Plano", callback_data: "comprar_plano" }],
          ],
        },
      });
      return res.sendStatus(200);
    }

    // === Comprar Plano ===
    if (data === "comprar_plano") {
      await limparMensagens(chatId);
      const planos = await Plan.find();
      if (!planos.length) {
        await sendMessage(chatId, "⚠️ Nenhum plano disponível no momento.");
        return res.sendStatus(200);
      }
      const botoes = planos.map(p => [
        { text: `${p.name} — R$${p.price.toFixed(2)}`, callback_data: `plano_${p._id}` },
      ]);
      await sendMessage(chatId, "💳 <b>Escolha o plano que deseja adquirir:</b>", {
        reply_markup: { inline_keyboard: botoes },
      });
    }

    // === Selecionar Plano ===
    if (data?.startsWith("plano_")) {
      await limparMensagens(chatId);
      const planoId = data.split("_")[1];
      const plano = await Plan.findById(planoId);
      if (!plano) {
        await sendMessage(chatId, "❌ Erro ao encontrar plano selecionado.");
        return res.sendStatus(200);
      }
      planoPorChat.set(chatId, plano);
      const pix = await gerarPixWiinPay(plano.price);
      if (!pix.success) {
        await sendMessage(chatId, "❌ Erro ao gerar pagamento via WiinPay.");
        return res.sendStatus(200);
      }
      qrsGerados.set(chatId, pix.qr_code);
      pagamentosPendentes.set(chatId, pix.paymentId);

await sendMessage(
  chatId,
  "⏰ O pagamento via PIX tem validade de 30 minutos.\n\n" +
  "✅ Após efetuar o pagamento, clique abaixo para verificar:",
  {
    reply_markup: {
      inline_keyboard: [
        [{ text: "🔍 Verificar Pagamento", callback_data: "verificar_pagamento" }],
        [{ text: "📷 Ver QR Code", callback_data: "mostrar_qr" }],
        [{ text: "🆘 Suporte", url: process.env.DEFAULT_SUPPORT_URL || "https://t.me/suporte" }],
      ],
    },
  }
);

      // 🕐 Verificação automática
      setTimeout(async () => await checarPagamentoAuto(chatId), 15000);
    }

    // === Mostrar QR Code ===
    if (data === "mostrar_qr") {
      const qr = qrsGerados.get(chatId);
      if (qr) await sendQrCode(chatId, qr);
    }

    // === Verificar Pagamento (manual) ===
    if (data === "verificar_pagamento") {
      await checarPagamentoAuto(chatId);
    }

    res.sendStatus(200);
  } catch (err) {
    console.error("🔥 Erro no webhook Telegram:", err);
    res.sendStatus(500);
  }
});

// === FUNÇÃO AUTOMÁTICA DE VERIFICAÇÃO ===
async function checarPagamentoAuto(chatId) {
  const paymentId = pagamentosPendentes.get(chatId);
  if (!paymentId) return;
  const plano = planoPorChat.get(chatId);
  const status = await verificarPixWiinPay(paymentId);
  console.log("🧾 [AUTO] Status detectado:", status);
  if (status.success && status.status === "PAID") {
    await sendMessage(chatId, "🎉 <b>Pagamento confirmado automaticamente!</b>");
    if (plano?.deliverable) {
      await sendMessage(chatId, `🚀 Seu acesso:\n${plano.deliverable}`);
    } else {
      await sendMessage(chatId, "✅ Pagamento recebido, mas o plano não possui entregável definido.");
    }
    pagamentosPendentes.delete(chatId);
  } else {
    console.log("⏳ Aguardando pagamento...");
    setTimeout(async () => await checarPagamentoAuto(chatId), 15000);
  }
}

// === ROTAS PAINEL ===
app.use("/", adminRoutes);

// === START SERVER ===
const PORT = process.env.PORT || 10000;
app.listen(PORT, "0.0.0.0", () => console.log(`🚀 Servidor rodando na porta ${PORT}`));
