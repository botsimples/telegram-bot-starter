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
    deliverableUrl: { type: String, default: "" }, // entregável automático
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

const Button = mongoose.model(
  "Button",
  new mongoose.Schema({
    text: String,
    action: String,
    value: String,
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

// === CONFIGURAR VIEWS ===
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

app.get("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/login"));
});

function requireLogin(req, res, next) {
  if (!req.session.loggedIn) return res.redirect("/login");
  next();
}

// === PAINEL ADMIN ===
app.get("/admin", requireLogin, async (req, res) => {
  const plans = await Plan.find();
  const buttons = await Button.find();
  const gateways = await Gateway.find();
  res.render("admin", { plans, buttons, gateways });
});

// === CRUD PLANOS ===
app.post("/admin/plan/create", requireLogin, async (req, res) => {
  const { name, price, description, deliverableUrl } = req.body;
  await Plan.create({ name, price, description, deliverableUrl });
  res.redirect("/admin");
});

app.post("/admin/plan/delete", requireLogin, async (req, res) => {
  await Plan.findByIdAndDelete(req.body.id);
  res.redirect("/admin");
});

app.post("/admin/plan/edit", requireLogin, async (req, res) => {
  const { id, name, price, description, deliverableUrl } = req.body;
  await Plan.findByIdAndUpdate(id, { name, price, description, deliverableUrl });
  res.redirect("/admin");
});

// === CRUD BOTÕES ===
app.post("/admin/button/create", requireLogin, async (req, res) => {
  await Button.create(req.body);
  res.redirect("/admin");
});

app.post("/admin/button/delete", requireLogin, async (req, res) => {
  await Button.findByIdAndDelete(req.body.id);
  res.redirect("/admin");
});

app.post("/admin/button/edit", requireLogin, async (req, res) => {
  const { id, text, action, value } = req.body;
  await Button.findByIdAndUpdate(id, { text, action, value });
  res.redirect("/admin");
});

// === CRUD GATEWAYS ===
app.post("/admin/gateway/create", requireLogin, async (req, res) => {
  const { nome, clientId, clientSecret, token } = req.body;
  await Gateway.create({ nome, clientId, clientSecret, token });
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
app.get("/", (req, res) => res.send("Bot online ✅"));

// === WEBHOOK TELEGRAM ===
app.post("/telegram-webhook", async (req, res) => {
  try {
    const update = req.body;
    console.log("📩 Atualização recebida:", JSON.stringify(update, null, 2));

    // === MENSAGEM /START ===
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
        { upsert: true, new: true }
      );

      const pagamento = await Payment.findOne({ telegramId: chatId, status: "paid" });

      if (!pagamento) {
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
      } else {
        const buttons = await Button.find();
        const inlineKeyboard = buttons.map((b) => [{ text: b.text, callback_data: b.action }]);
        await axios.post(`${API}/sendMessage`, {
          chat_id: chatId,
          text: `✅ Seu plano está ativo!\n\nEscolha uma opção abaixo:`,
          reply_markup: { inline_keyboard: inlineKeyboard },
        });
      }
    }

    // === CALLBACK COMPRAR PLANO ===
    if (update.callback_query) {
      const cq = update.callback_query;
      const chatId = cq.message.chat.id;
      const data = cq.data;

      if (data === "comprar_plano") {
        const plano = await Plan.findOne();
        const ativo = await Gateway.findOne({ ativo: true });

        if (!ativo) {
          await axios.post(`${API}/sendMessage`, { chat_id: chatId, text: "❌ Nenhum gateway PIX está ativo." });
          return res.sendStatus(200);
        }

        let retorno;
        let paymentId = null;

        // === WIINPAY ===
        if (ativo.nome.toLowerCase() === "wiinpay") {
          const resp = await axios.post("https://api.wiinpay.com.br/payment/create", {
            api_key: ativo.token || process.env.WIINPAY_API_KEY,
            value: plano?.price || 9.9,
            name: "Cliente Telegram",
            email: "cliente@teste.com",
            description: plano?.name || "Plano VIP Telegram",
            webhook_url: process.env.PIX_WEBHOOK_URL,
          });
          retorno = resp.data;
          paymentId = resp.data?.data?.paymentId || null;
        }

        // === SYNCPAY ===
        else if (ativo.nome.toLowerCase() === "syncpay") {
          try {
            // Gerar token OAuth2
            const tokenResp = await axios.post("https://api.syncpayments.com.br/v1/oauth/token", {
              client_id: ativo.clientId,
              client_secret: ativo.clientSecret,
              grant_type: "client_credentials",
            });

            const accessToken = tokenResp.data.access_token;

            // Criar cobrança PIX
            const cobranca = await axios.post(
              "https://api.syncpayments.com.br/v1/pix/cob",
              {
                valor: String(plano?.price || "9.90"),
                descricao: plano?.name || "Plano VIP Telegram",
                webhook: process.env.PIX_WEBHOOK_URL,
              },
              { headers: { Authorization: `Bearer ${accessToken}` } }
            );

            retorno = {
              data: {
                pix: { code: cobranca.data.pixCopiaECola },
                paymentId: cobranca.data.txid || cobranca.data.id,
              },
            };
            paymentId = cobranca.data.txid || cobranca.data.id;
          } catch (err) {
            console.error("Erro SyncPay:", err.response?.data || err.message);
            retorno = { data: { pix: { code: "ERRO_SYNCPAY" } } };
          }
        }

        const codigoPix = retorno?.data?.pix?.code || "Erro ao gerar PIX";

        await Payment.create({
          telegramId: chatId,
          paymentId,
          amount: plano?.price || 9.9,
          gateway: ativo.nome,
          planId: plano?._id,
          meta: retorno?.data,
        });

        await axios.post(`${API}/sendMessage`, {
          chat_id: chatId,
          text: `💰 Pagamento via PIX gerado!\n\n\`${codigoPix}\`\n\n⚡ Assim que o pagamento for confirmado, seu entregável será liberado automaticamente.`,
          parse_mode: "Markdown",
        });
      }

      await axios.post(`${API}/answerCallbackQuery`, { callback_query_id: cq.id });
    }

    res.sendStatus(200);
  } catch (err) {
    console.error("Erro:", err?.response?.data || err.message);
    res.sendStatus(200);
  }
});

// === WEBHOOK DE PAGAMENTO ===
app.post("/pix/webhook", async (req, res) => {
  try {
    const body = req.body;
    console.log("📥 Webhook recebido:", JSON.stringify(body).slice(0, 1000));

    const paymentId = body?.data?.paymentId || body?.data?.id || null;
    if (!paymentId) return res.status(400).send("paymentId not found");

    const payment = await Payment.findOneAndUpdate({ paymentId }, { status: "paid", meta: body }, { new: true });
    if (!payment) return res.status(404).send("not found");

    const plan = await Plan.findById(payment.planId);
    const deliver = plan?.deliverableUrl || process.env.DEFAULT_DELIVERABLE_URL;

    await axios.post(`${API}/sendMessage`, {
      chat_id: payment.telegramId,
      text: `✅ Pagamento confirmado!\n\nAqui está seu entregável:\n${deliver || "Acesso liberado."}`,
      parse_mode: "Markdown",
    });

    res.status(200).send("ok");
  } catch (err) {
    console.error("Erro no webhook:", err.message);
    res.status(500).send("error");
  }
});

// === INICIAR SERVIDOR ===
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Servidor rodando na porta ${PORT}`));
