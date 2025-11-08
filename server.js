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

// === MAPA DE PAGAMENTOS PENDENTES ===
const pagamentosPendentes = new Map();

// === FUNÇÃO: Enviar mensagem Telegram ===
async function sendMessage(chatId, text, options = {}) {
  try {
    await axios.post(`${API}/sendMessage`, {
      chat_id: chatId,
      text,
      parse_mode: "MarkdownV2",
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
    // ignora
  }
}

// === WEBHOOK TELEGRAM ===
app.post(`/webhook/${TOKEN}`, async (req, res) => {
  try {
    const update = req.body;
    console.log("📩 Atualização recebida:", JSON.stringify(update, null, 2));

    // === /start ===
    if (update.message?.text === "/start") {
      const chatId = update.message.chat.id;
      await sendMessage(
        chatId,
        "🔥 *Bem-vindo ao BotSimples!*\n\nEscolha uma opção abaixo 👇",
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

    const callback = update.callback_query;
    const chatId = callback?.message?.chat?.id;
    const data = callback?.data;
    const messageId = callback?.message?.message_id;

    if (!chatId) return res.sendStatus(200);

    // === BOTÃO: COMPRAR PLANO ===
    if (data === "comprar_plano") {
      await deleteMessage(chatId, messageId);

      const plans = await mongoose.model("Plan").find();
      if (!plans.length) {
        await sendMessage(chatId, "⚠️ Nenhum plano disponível no momento.");
        return res.sendStatus(200);
      }

      const botoesPlanos = plans.map((p) => [
        {
          text: `${p.name} — R$${p.price}`,
          callback_data: `plano_${p.price}`,
        },
      ]);

      await sendMessage(chatId, "💳 Escolha o plano que deseja adquirir:", {
        reply_markup: { inline_keyboard: botoesPlanos },
      });
    }

    // === SELECIONAR PLANO ===
    if (data?.startsWith("plano_")) {
      await deleteMessage(chatId, messageId);

      const valor = parseFloat(data.split("_")[1]);

      const ultimoPix = pagamentosPendentes.get(chatId);
      if (ultimoPix && Date.now() - ultimoPix < 60 * 1000) {
        await sendMessage(chatId, "⚠️ Você precisa aguardar 1 minuto para gerar outro PIX.");
        return res.sendStatus(200);
      }

      pagamentosPendentes.set(chatId, Date.now());

      const pix = await gerarPixWiinPay(valor);
      if (!pix.success) {
        await sendMessage(chatId, "❌ Erro ao gerar pagamento via WiinPay. Tente novamente mais tarde.");
        return res.sendStatus(200);
      }

      // MENSAGENS DO PIX
      await sendMessage(
        chatId,
        `*Toque no código PIX abaixo para copiar:*\n\n⚠️ *Atenção: este código PIX tem validade de 30 minutos.*`
      );

      await sendMessage(chatId, `\`${pix.qr_code}\``);

      await sendMessage(
        chatId,
        `💡 *Lembrete:* o pagamento via PIX tem validade de *30 minutos*.\n\n✅ Após efetuar o pagamento, se o sistema não reconhecer automaticamente, clique em *Verificar Pagamento*.\n\n⚠️ Ao realizar o pagamento, você declara estar ciente de que este é um produto digital de consumo imediato, não passível de reembolso por arrependimento.`,
        {
          reply_markup: {
            inline_keyboard: [
              // PRIMEIRA LINHA: botão grande
              [{ text: "🔍 Verificar Pagamento", callback_data: `verificar_${pix.paymentId}` }],
              // SEGUNDA LINHA: QR e suporte
              [
                { text: "📷 Ler QR Code", url: `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(pix.qr_code)}` },
                { text: "🆘 Suporte", url: "https://t.me/seusupport" },
              ],
            ],
          },
        }
      );
    }

    // === BOTÃO: VERIFICAR PAGAMENTO ===
    if (data?.startsWith("verificar_")) {
      await deleteMessage(chatId, messageId);
      const paymentId = data.split("_")[1];

      try {
        const result = await verificarPixWiinPay(paymentId);
        if (result.success && result.status === "PAID") {
          await sendMessage(chatId, "🎉 Pagamento confirmado! Seu acesso foi liberado automaticamente.");
        } else {
          await sendMessage(chatId, "⏳ Pagamento ainda *não* foi confirmado. Tente novamente em alguns segundos.");
        }
      } catch {
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
