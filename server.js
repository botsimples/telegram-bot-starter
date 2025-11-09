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

// === FUNÇÃO: Enviar vídeo inicial ===
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

// === FUNÇÃO: Enviar imagem QR (corrigida) ===
async function sendQrCode(chatId, qrData) {
  const qrReal = qrData?.qr_code || qrData?.data?.qr_code || qrData;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrReal)}`;
  try {
    const res = await axios.post(`${API}/sendPhoto`, {
      chat_id: chatId,
      photo: qrUrl,
      caption: "📷 Escaneie o QR Code acima para pagar via PIX",
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

// === FUNÇÃO: Apagar TODAS as mensagens ===
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

      const Plan = mongoose.models.Plan || mongoose.model("Plan", new mongoose.Schema({
        name: String,
        price: Number,
        description: String,
        deliverable: String,
      }));

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

      const planId = data.split("_")[1];
      const Plan = mongoose.models.Plan || mongoose.model("Plan", new mongoose.Schema({
        name: String,
        price: Number,
        description: String,
        deliverable: String,
      }));

      const plano = await Plan.findById(planId);
      if (!plano) {
        await sendMessage(chatId, "⚠️ Erro: plano não encontrado.");
        return res.sendStatus(200);
      }

      const valor = parseFloat(plano.price);

      // ✅ Envia chat_id no metadata
      const pix = await gerarPixWiinPay(valor, {
        metadata: { origem: "telegram-bot", chat_id: chatId },
      });

      if (!pix.success) {
        await sendMessage(chatId, "❌ Erro ao gerar pagamento via WiinPay.");
        return res.sendStatus(200);
      }

      const qrReal = pix.qr_code || pix.data?.qr_code;
      qrsGerados.set(chatId, qrReal);
      pagamentosPendentes.set(chatId, pix.paymentId || pix.data?.paymentId);

      await sendMessage(chatId, "💰 <b>Toque no código PIX abaixo para copiar:</b>");
      await sendMessage(chatId, `<code>${qrReal}</code>`);

      await sendMessage(
        chatId,
        "⏰ O pagamento via PIX tem validade de 30 minutos.\n\n✅ Após efetuar o pagamento, clique abaixo para verificar:",
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

// === WEBHOOK WIINPAY (entrega automática) ===
app.post("/webhook", async (req, res) => {
  try {
    const { data } = req.body;
    if (!data || !data.payment) return res.sendStatus(400);

    const payment = data.payment;
    const status = payment.status;
    const valor = payment.total;
    const chatId = payment.metadata?.chat_id;

    console.log("📦 [WEBHOOK] Pagamento recebido:", status, "R$", valor);

    const Plan = mongoose.models.Plan || mongoose.model("Plan", new mongoose.Schema({
      name: String,
      price: Number,
      description: String,
      deliverable: String,
    }));

    const plano = await Plan.findOne({
      price: { $gte: valor - 0.1, $lte: valor + 0.1 },
    });

    if (!plano) {
      console.log("⚠️ Nenhum plano encontrado com esse valor:", valor);
      return res.sendStatus(200);
    }

    if (status === "PAID" && chatId) {
      await axios.post(`${API}/sendMessage`, {
        chat_id: chatId,
        text: `🎉 <b>Pagamento confirmado!</b>\n${plano.description || "Seu acesso foi liberado automaticamente."}\n\n${plano.deliverable}`,
        parse_mode: "HTML",
      });
    }

    res.sendStatus(200);
  } catch (err) {
    console.error("❌ Erro no webhook WiinPay:", err.message);
    res.sendStatus(500);
  }
});

app.use("/", adminRoutes);

const PORT = process.env.PORT || 10000;
app.listen(PORT, "0.0.0.0", () => console.log(`🚀 Servidor rodando na porta ${PORT}`));
