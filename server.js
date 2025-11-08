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

// === PAINEL ADMIN (CRUD PLANOS) ===
app.get("/admin", requireLogin, async (req, res) => {
  const plans = await Plan.find();
  res.render("admin", { plans });
});

// === CRIAR PLANO ===
app.post("/admin/plan/create", requireLogin, async (req, res) => {
  try {
    const { name, price, description } = req.body;
    await Plan.create({ name, price, description });
    res.redirect("/admin");
  } catch (err) {
    console.error("Erro ao criar plano:", err.message);
    res.send("Erro ao criar plano.");
  }
});

// === EXCLUIR PLANO ===
app.post("/admin/plan/delete", requireLogin, async (req, res) => {
  try {
    await Plan.findByIdAndDelete(req.body.id);
    res.redirect("/admin");
  } catch (err) {
    console.error("Erro ao excluir plano:", err.message);
    res.send("Erro ao excluir plano.");
  }
});

// === EDITAR PLANO ===
app.post("/admin/plan/edit", requireLogin, async (req, res) => {
  try {
    const { id, name, price, description } = req.body;
    await Plan.findByIdAndUpdate(id, { name, price, description });
    res.redirect("/admin");
  } catch (err) {
    console.error("Erro ao editar plano:", err.message);
    res.send("Erro ao editar plano.");
  }
});

// === ROTA PADRÃO ===
app.get("/", (req, res) => res.send("Bot online ✅"));

// === WEBHOOK TELEGRAM (mantém o bot ativo) ===
app.post("/telegram-webhook", async (req, res) => {
  try {
    const update = req.body;
    console.log("📩 Atualização recebida:", JSON.stringify(update, null, 2));
    res.sendStatus(200);
  } catch (err) {
    console.error("Erro:", err.message);
    res.sendStatus(200);
  }
});

// === INICIAR SERVIDOR ===
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Servidor rodando na porta ${PORT}`));
