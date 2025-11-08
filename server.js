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
const pagamentosPendentes = new Map();
const ultimasMensagens = new Map();

// === FUNÇÃO: Enviar mensagem Telegram ===
async function sendMessage(chatId, text, options = {}) {
  try {
    const res = await axios.post(`${API}/sendMessage`, {
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      ...options,
    });
    return res.data?.result?.message_id;
  } catch (err) {
    console.error("Erro ao enviar mensagem Telegram:", err.response?.data || err.message);
    return null;
  }
}

// === FUNÇÃO: Apagar mensagens anteriores ===
async function deleteUltimaMensagem(chatId) {
  const lastMsgId = ultimasMensagens.get(chatId);
  if (!lastMsgId) return;
  try {
    await axios.post(`${API}/deleteMessage`, {
      chat_id: chatId,
      message_id: lastMsgId,
    });
  } catch {}
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
    const messageId = callback?.message?.message_id;

    if (!chatId) return res.sendStatus(200);

    // === COMANDO /start ===
    if (message?.text === "/start") {
      await deleteUltimaMensagem(chatId);
      const msg1 = await sendMessage(chatId, "🔥 <b>Bem-vindo ao BotSimples!</b>");
      const msg2 = await sendMessage(chatId, "Escolha uma opção abaixo 👇", {
        reply_markup: {
          inline_keyboard: [
            [{ text: "💳 Comprar Plano", callback_data: "comprar_plano" }],
            [{ text: "📢 Canal VIP", url: "https://t.me/seucanal" }],
          ],
        },
      });
      ultimasMensagens.set(chatId, msg2);
      return res.sendStatus(200);
    }

    // === BOTÃO: COMPRAR PLANO ===
    if (data === "comprar_plano") {
      await deleteUltimaMensagem(chatId);

      const Plan = mongoose.models.Plan || mongoose.model("Plan", new mongoose.Schema({
        name: String,
        price: Number,
        description: String
      }));

      const planos = await Plan.find();

      if (!planos.length) {
        const msg = await sendMessage(chatId, "⚠️ Nenhum plano disponível no momento.");
        ultimasMensagens.set(chatId, msg);
        return res.sendStatus(200);
      }

      const botoes = planos.map(p => [
        { text: `${p.name} — R$${p.price.toFixed(2)}`, callback_data: `plano_${p.price}` }
      ]);

      const msg = await sendMessage(chatId, "💳 <b>Escolha o plano que deseja adquirir:</b>", {
        reply_markup: { inline_keyboard: botoes },
      });
      ultimasMensagens.set(chatId, msg);
    }

    // === SELECIONAR PLANO ===
    if (data?.startsWith("plano_")) {
      await deleteUltimaMensagem(chatId);

      const valor = parseFloat(data.split("_")[1]);
      pagamentosPendentes.set(chatId, Date.now());

      const pix = await gerarPixWiinPay(valor);
      if (!pix.success) {
        const msg = await sendMessage(chatId, "❌ Erro ao gerar pagamento via WiinPay. Tente novamente mais tarde.");
        ultimasMensagens.set(chatId, msg);
        return res.sendStatus(200);
      }

      await sendMessage(chatId, "💰 <b>Toque no código PIX abaixo para copiar:</b>\n⚠️ Este código tem validade de 30 minutos.");
      await sendMessage(chatId, `<code>${pix.qr_code}</code>`);

      const msg = await sendMessage(
        chatId,
        "⏰ Lembrete: o pagamento via PIX tem validade de 30 minutos.\n\n" +
        "✅ Após efetuar o pagamento, se o sistema não reconhecer automaticamente, clique em <b>Verificar Pagamento</b>.\n\n" +
        "⚠️ Ao realizar o pagamento, você declara estar ciente de que este é um produto digital de consumo imediato.",
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: "🔍 Verificar Pagamento", callback_data: `verificar_${pix.paymentId}` }],
              [
                { text: "📷 Ler QR Code", url: `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(pix.qr_code)}` },
                { text: "🆘 Suporte", url: process.env.DEFAULT_SUPPORT_URL || "https://t.me/suporte" },
              ],
            ],
          },
        }
      );
      ultimasMensagens.set(chatId, msg);
    }

    // === BOTÃO: VERIFICAR PAGAMENTO ===
    if (data?.startsWith("verificar_")) {
      await deleteUltimaMensagem(chatId);
      const paymentId = data.split("_")[1];
      const status = await verificarPixWiinPay(paymentId);

      let msg;
      if (status.success && status.status === "PAID") {
        msg = await sendMessage(chatId, "🎉 <b>Pagamento confirmado!</b>\nSeu acesso foi liberado automaticamente.");
      } else {
        msg = await sendMessage(chatId, "⏳ Pagamento ainda não confirmado. Tente novamente em alguns segundos.");
      }
      ultimasMensagens.set(chatId, msg);
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
