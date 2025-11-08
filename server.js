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
const WIINPAY_API_KEY = process.env.WIINPAY_API_KEY;
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

const Payment = mongoose.model(
  "Payment",
  new mongoose.Schema({
    telegramId: Number,
    paymentId: String,
    amount: Number,
    status: { type: String, default: "pending" },
    date: { type: Date, default: Date.now },
  })
);

const Plan = mongoose.model(
  "Plan",
  new mongoose.Schema({
    name: String,
    price: Number,
    description: String,
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

// === PAINEL ADMIN (PLANOS E BOTÕES) ===
app.get("/admin", requireLogin, async (req, res) => {
  const plans = await Plan.find();
  const buttons = await Button.find();
  res.render("admin", { plans, buttons });
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

app.post("/admin/plan/edit", requireLogin, async (req, res) => {
  const { id, name, price, description } = req.body;
  await Plan.findByIdAndUpdate(id, { name, price, description });
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

    // === CALLBACK DOS BOTÕES ===
    if (update.callback_query) {
      const cq = update.callback_query;
      const chatId = cq.message.chat.id;
      const data = cq.data;

      if (data === "comprar_plano") {
        const pagamento = await axios.post("https://api.wiinpay.com.br/payment/create", {
          api_key: WIINPAY_API_KEY,
          value: 9.9,
          name: "Cliente Telegram",
          email: "cliente@teste.com",
          description: "Plano VIP Telegram",
          webhook_url: "https://telegram-bot-starter-ggy2.onrender.com/pix/webhook",
        });

        const retorno = pagamento.data;
        const codigoPix = retorno?.pix?.code || JSON.stringify(retorno, null, 2);

        await Payment.create({
          telegramId: chatId,
          paymentId: retorno.data?.paymentId || "none",
          amount: 9.9,
        });

        await axios.post(`${API}/sendMessage`, {
          chat_id: chatId,
          text: `💰 *Pagamento via PIX gerado com sucesso!*\n\nCopie o código abaixo e cole no seu banco:\n\n\`${codigoPix}\`\n\n⚡ Assim que o pagamento for confirmado, seu acesso será liberado automaticamente.`,
          parse_mode: "Markdown",
        });
      }

      await axios.post(`${API}/answerCallbackQuery`, {
        callback_query_id: cq.id,
      });
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
    const paymentId = body?.data?.paymentId;

    if (paymentId) {
      await Payment.findOneAndUpdate({ paymentId }, { status: "paid" });
      console.log("Pagamento confirmado:", paymentId);
    }

    res.sendStatus(200);
  } catch (err) {
    console.error("Erro no webhook:", err.message);
    res.sendStatus(200);
  }
});

// === INICIAR SERVIDOR ===
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Servidor rodando na porta ${PORT}`));
