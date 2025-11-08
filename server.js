// ==========================
// server.js — Painel BotSimples (SaaS Telegram Universal)
// ==========================

const express = require("express");
const axios = require("axios");
const mongoose = require("mongoose");
const session = require("express-session");
const path = require("path");
require("dotenv").config();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// === VARIÁVEIS ===
const TOKEN = process.env.TELEGRAM_TOKEN;
const API = `https://api.telegram.org/bot${TOKEN}`;
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
    deliverableUrl: { type: String, default: "" },
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
  res.render("admin", { plans, buttons: [], gateways });
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
app.post("/admin/gateway/update", requireLogin, async (req, res) => {
  const { id, clientId, clientSecret, token } = req.body;
  await Gateway.findByIdAndUpdate(id, { clientId, clientSecret, token, atualizadoEm: Date.now() });
  res.redirect("/admin");
});
app.post("/admin/gateway/ativar", requireLogin, async (req, res) => {
  const { id } = req.body;
  await Gateway.updateMany({}, { ativo: false });
  await Gateway.findByIdAndUpdate(id, { ativo: true });
  res.redirect("/admin");
});

// === ROTA PADRÃO ===
app.get("/", (req, res) => res.send("✅ BotSimples online e funcionando!"));

// === WEBHOOK TELEGRAM ===
app.post("/telegram-webhook", async (req, res) => {
  try {
    const update = req.body;
    console.log("📩 Atualização recebida:", JSON.stringify(update, null, 2));

    if (update.message && update.message.text === "/start") {
      const chatId = update.message.chat.id;
      const user = update.message.from;
      await User.findOneAndUpdate(
        { telegramId: user.id },
        {
          telegramId: user.id,
          username: user.username,
          firstName: user.first_name,
          lastName: user.last_name,
        },
        { upsert: true }
      );

      const caption = "🔥 *Bem-vindo ao BotSimples!*\n\nEscolha uma opção abaixo 👇";
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

    // === CALLBACK: COMPRAR PLANO ===
    if (update.callback_query) {
      const cq = update.callback_query;
      const chatId = cq.message.chat.id;
      const data = cq.data;

      if (data === "comprar_plano") {
        const planos = await Plan.find();
        const botoes = planos.map((p) => [
          { text: `${p.name} — R$${p.price}`, callback_data: `plano_${p.id}` },
        ]);

        await axios.post(`${API}/sendMessage`, {
          chat_id: chatId,
          text: "💳 Escolha o plano que deseja adquirir:",
          reply_markup: { inline_keyboard: botoes },
        });
      }

      // === CALLBACK: PLANO SELECIONADO ===
      if (data.startsWith("plano_")) {
        const planoId = data.split("_")[1];
        const plano = await Plan.findById(planoId);
        const ativo = await Gateway.findOne({ ativo: true });

        if (!ativo) {
          await axios.post(`${API}/sendMessage`, { chat_id: chatId, text: "❌ Nenhum gateway ativo." });
          return res.sendStatus(200);
        }

        // 🔹 Carrega o módulo do gateway dinâmico
        const { gerarPix } = require(`./integrations/${ativo.nome.toLowerCase()}`);
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

        await axios.post(`${API}/sendMessage`, {
          chat_id: chatId,
          text: `💰 Pagamento via PIX gerado!\n\n\`${retorno.pixCode}\`\n\n⚡ Assim que o pagamento for confirmado, seu entregável será liberado automaticamente.`,
          parse_mode: "Markdown",
        });
      }

      await axios.post(`${API}/answerCallbackQuery`, { callback_query_id: cq.id });
    }

    res.sendStatus(200);
  } catch (err) {
    console.error("🔥 Erro no webhook Telegram:", err.message);
    res.sendStatus(200);
  }
});

// === WEBHOOK DE PAGAMENTO UNIVERSAL ===
app.post("/pix/webhook", async (req, res) => {
  try {
    const body = req.body;
    console.log("📥 Webhook recebido:", JSON.stringify(body).slice(0, 800));

    const paymentId = body?.data?.id || body?.id;
    const status = body?.data?.status || body?.status;

    if (!paymentId) return res.status(400).send("paymentId not found");

    if (status && status.toUpperCase() === "PAID") {
      const payment = await Payment.findOneAndUpdate(
        { paymentId },
        { status: "paid", meta: body },
        { new: true }
      );
      if (!payment) return res.status(404).send("not found");

      const plan = await Plan.findById(payment.planId);
      const deliver = plan?.deliverableUrl || process.env.DEFAULT_DELIVERABLE_URL;

      await axios.post(`${API}/sendMessage`, {
        chat_id: payment.telegramId,
        text: `✅ Pagamento confirmado!\n\nAqui está seu entregável:\n${deliver || "Acesso liberado."}`,
        parse_mode: "Markdown",
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
