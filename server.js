// ==========================
// server.js — BotSimples SaaS Universal
// ==========================

const express = require("express");
const axios = require("axios");
const mongoose = require("mongoose");
const session = require("express-session");
const path = require("path");
const fs = require("fs");
require("dotenv").config();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// === VARIÁVEIS GERAIS ===
const MONGO_URI = process.env.MONGO_URI;

// === CONECTAR AO MONGO ===
mongoose
  .connect(MONGO_URI)
  .then(() => console.log("✅ MongoDB conectado com sucesso!"))
  .catch((err) => console.error("❌ Erro ao conectar ao MongoDB:", err.message));

// === MIDDLEWARE DE SESSÃO ===
app.use(
  session({
    secret: process.env.SESSION_SECRET || "painel-botsimples",
    resave: false,
    saveUninitialized: true,
  })
);

// === MODELOS ===
const User = mongoose.model(
  "User",
  new mongoose.Schema({
    telegramId: Number,
    username: String,
    firstName: String,
    lastName: String,
    dateJoined: { type: Date, default: Date.now },
  })
);

const Plan = mongoose.model(
  "Plan",
  new mongoose.Schema({
    name: String,
    price: Number,
    description: String,
    deliverableUrl: String,
  })
);

const Payment = mongoose.model(
  "Payment",
  new mongoose.Schema({
    telegramId: Number,
    paymentId: String,
    amount: Number,
    gateway: String,
    planId: { type: mongoose.Schema.Types.ObjectId, ref: "Plan" },
    status: { type: String, default: "pending" },
    meta: Object,
    date: { type: Date, default: Date.now },
  })
);

const Gateway = mongoose.model(
  "Gateway",
  new mongoose.Schema({
    nome: String,
    clientId: String,
    clientSecret: String,
    token: String,
    ativo: { type: Boolean, default: false },
    atualizadoEm: { type: Date, default: Date.now },
  })
);

const Settings = mongoose.model(
  "Settings",
  new mongoose.Schema({
    suporteUrl: { type: String, default: "https://t.me/suporte" },
    pixMessage: {
      type: String,
      default:
        "💸 *Pagamento via PIX gerado!*\n\n📦 Plano: *{plan}*\n💰 Valor: *R${price}*\n\n⚠️ Código válido por 30 minutos.\n\n{pix}\n\nApós o pagamento, clique em *Verificar Pagamento.*",
    },
    limitePixMinutos: { type: Number, default: 1 },
    ativo: { type: Boolean, default: true },
  })
);

const Bot = mongoose.model(
  "Bot",
  new mongoose.Schema({
    nome: String,
    token: String,
    username: String,
    ativo: { type: Boolean, default: true },
    gateways: [{ type: mongoose.Schema.Types.ObjectId, ref: "Gateway" }],
    settings: { type: mongoose.Schema.Types.ObjectId, ref: "Settings" },
    criadoEm: { type: Date, default: Date.now },
  })
);

// === CONFIGURAÇÃO DAS VIEWS ===
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// === LOGIN ADMIN ===
app.get("/login", (req, res) => {
  if (req.session.loggedIn) return res.redirect("/admin");
  res.send(`
    <form method="POST" action="/login" style="font-family:sans-serif;text-align:center;margin-top:80px">
      <h2>Login do Painel</h2>
      <input name="user" placeholder="Usuário" style="padding:8px;margin:5px"/><br>
      <input name="pass" placeholder="Senha" type="password" style="padding:8px;margin:5px"/><br>
      <button style="padding:8px 16px">Entrar</button>
    </form>
  `);
});

app.post("/login", (req, res) => {
  const { user, pass } = req.body;
  if (user === process.env.ADMIN_USER && pass === process.env.ADMIN_PASS) {
    req.session.loggedIn = true;
    return res.redirect("/admin");
  }
  res.send("Usuário ou senha inválidos. <a href='/login'>Tentar novamente</a>");
});

app.get("/logout", (req, res) => req.session.destroy(() => res.redirect("/login")));

function requireLogin(req, res, next) {
  if (!req.session.loggedIn) return res.redirect("/login");
  next();
}

// === PAINEL ADMIN ===
app.get("/admin", requireLogin, async (req, res) => {
  const plans = await Plan.find();
  const gateways = await Gateway.find();
  const settings = await Settings.findOne();
  const bots = await Bot.find();
  res.render("admin", { plans, gateways, settings, bots });
});

// === ATUALIZAR CONFIGURAÇÕES ===
app.post("/admin/settings/update", requireLogin, async (req, res) => {
  const { suporteUrl, pixMessage, limitePixMinutos } = req.body;
  await Settings.findOneAndUpdate(
    {},
    { suporteUrl, pixMessage, limitePixMinutos },
    { upsert: true }
  );
  res.redirect("/admin");
});

// === CRUD PLANOS ===
app.post("/admin/plan/create", requireLogin, async (req, res) => {
  await Plan.create(req.body);
  res.redirect("/admin");
});

app.post("/admin/plan/delete", requireLogin, async (req, res) => {
  await Plan.findByIdAndDelete(req.body.id);
  res.redirect("/admin");
});

// === CRUD GATEWAYS ===
app.post("/admin/gateway/create", requireLogin, async (req, res) => {
  await Gateway.create(req.body);
  res.redirect("/admin");
});

app.post("/admin/gateway/ativar", requireLogin, async (req, res) => {
  await Gateway.updateMany({}, { ativo: false });
  await Gateway.findByIdAndUpdate(req.body.id, { ativo: true });
  res.redirect("/admin");
});

// === TELEGRAM WEBHOOK UNIVERSAL ===
app.post("/telegram-webhook/:botId", async (req, res) => {
  try {
    const bot = await Bot.findById(req.params.botId)
      .populate("gateways settings");
    if (!bot) return res.status(404).send("Bot não encontrado.");

    const API = `https://api.telegram.org/bot${bot.token}`;
    const update = req.body;
    const settings = bot.settings || {};
    const ativo = await Gateway.findOne({ ativo: true });

    if (update.message?.text === "/start") {
      const chatId = update.message.chat.id;
      await axios.post(`${API}/sendPhoto`, {
        chat_id: chatId,
        photo: "https://i.imgur.com/NnZXOqK.png",
        caption: "🔥 *Bem-vindo ao BotSimples!*\n\nEscolha uma opção abaixo 👇",
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [{ text: "💳 Comprar Plano", callback_data: "comprar_plano" }],
            [{ text: "📢 Canal VIP", url: "https://t.me/seucanal" }],
          ],
        },
      });
    }

    if (update.callback_query) {
      const cq = update.callback_query;
      const chatId = cq.message.chat.id;
      const data = cq.data;

      // Deleta mensagem anterior (exceto PIX)
      if (!data.startsWith("verificar_")) {
        await axios.post(`${API}/deleteMessage`, {
          chat_id: chatId,
          message_id: cq.message.message_id,
        });
      }

      // === Selecionar plano ===
      if (data === "comprar_plano") {
        const planos = await Plan.find();
        const botoes = planos.map((p) => [
          { text: `${p.name} — R$${p.price}`, callback_data: `plano_${p._id}` },
        ]);
        await axios.post(`${API}/sendMessage`, {
          chat_id: chatId,
          text: "💳 Escolha o plano que deseja adquirir:",
          reply_markup: { inline_keyboard: botoes },
        });
      }

      // === Geração PIX ===
      if (data.startsWith("plano_")) {
        const planoId = data.split("_")[1];
        const plano = await Plan.findById(planoId);

        const ultimo = await Payment.findOne({ telegramId: chatId }).sort({ date: -1 });
        const limite = (settings.limitePixMinutos || 1) * 60 * 1000;
        if (ultimo && Date.now() - ultimo.date < limite) {
          await axios.post(`${API}/sendMessage`, {
            chat_id: chatId,
            text: "⚠️ Aguarde 1 minuto antes de gerar outro PIX.",
          });
          return res.sendStatus(200);
        }

        const gatewayFile = ativo.nome.toLowerCase();
        const integrationPath = `./integrations/${gatewayFile}.js`;

        if (!fs.existsSync(integrationPath)) {
          await axios.post(`${API}/sendMessage`, {
            chat_id: chatId,
            text: `❌ Integração ${ativo.nome} não encontrada.`,
          });
          return res.sendStatus(200);
        }

        const { gerarPix } = require(integrationPath);
        const retorno = await gerarPix(plano, process.env.PIX_WEBHOOK_URL, {
          apiKey: ativo.token,
          clientId: ativo.clientId,
          clientSecret: ativo.clientSecret,
        });

        await Payment.create({
          telegramId: chatId,
          paymentId: retorno.paymentId,
          amount: plano.price,
          gateway: ativo.nome,
          planId: plano._id,
          meta: retorno,
        });

        const msgPix = (settings.pixMessage || "")
          .replace("{plan}", plano.name)
          .replace("{price}", plano.price)
          .replace("{pix}", retorno.pixCode || "ERRO_PIX")
          .replace("{suporte}", settings.suporteUrl || "https://t.me/suporte");

        const botoes = {
          inline_keyboard: [
            [
              { text: "✅ Verificar Pagamento", callback_data: `verificar_${retorno.paymentId}` },
              { text: "📞 Suporte", url: settings.suporteUrl || "https://t.me/suporte" },
            ],
          ],
        };

        await axios.post(`${API}/sendMessage`, {
          chat_id: chatId,
          text: msgPix,
          parse_mode: "Markdown",
          reply_markup: botoes,
        });
      }

      // === Verificar pagamento ===
      if (data.startsWith("verificar_")) {
        const paymentId = data.split("_")[1];
        const p = await Payment.findOne({ paymentId });
        if (!p) {
          await axios.post(`${API}/sendMessage`, {
            chat_id: chatId,
            text: "❌ Pagamento não encontrado.",
          });
          return res.sendStatus(200);
        }

        if (p.status === "paid" || p.status === "PAID") {
          const plan = await Plan.findById(p.planId);
          await axios.post(`${API}/sendMessage`, {
            chat_id: chatId,
            text: `✅ Pagamento confirmado!\n\nAcesso: ${plan?.deliverableUrl || "Liberado!"}`,
          });
        } else {
          await axios.post(`${API}/sendMessage`, {
            chat_id: chatId,
            text: "⚠️ Pagamento ainda *não confirmado*. Tente novamente.",
            parse_mode: "Markdown",
          });
        }
      }

      await axios.post(`${API}/answerCallbackQuery`, { callback_query_id: cq.id });
    }

    res.sendStatus(200);
  } catch (err) {
    console.error("🔥 Erro no webhook Telegram:", err.message);
    res.sendStatus(200);
  }
});

// === WEBHOOK DE PAGAMENTO ===
app.post("/pix/webhook", async (req, res) => {
  try {
    const body = req.body;
    const paymentId = body?.data?.id || body?.id;
    const status = body?.data?.status || body?.status;

    if (!paymentId) return res.status(400).send("paymentId not found");

    const payment = await Payment.findOneAndUpdate(
      { paymentId },
      { status: status },
      { new: true }
    );
    if (!payment) return res.status(404).send("not found");

    if (status === "paid" || status === "PAID") {
      const plan = await Plan.findById(payment.planId);
      const bot = await Bot.findOne({ ativo: true });
      const API = `https://api.telegram.org/bot${bot.token}`;

      await axios.post(`${API}/sendMessage`, {
        chat_id: payment.telegramId,
        text: `✅ Pagamento confirmado!\n\nAcesso: ${plan?.deliverableUrl || "Liberado!"}`,
      });
    }

    res.status(200).send("ok");
  } catch (err) {
    console.error("❌ Erro no webhook PIX:", err.message);
    res.status(500).send("error");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Servidor rodando na porta ${PORT}`));
