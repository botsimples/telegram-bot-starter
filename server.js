// ==============================
// ⚡ TIGERFY SERVER.JS (CommonJS)
// ==============================

const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const session = require("express-session");
const dotenv = require("dotenv");
const expressLayouts = require("express-ejs-layouts");

// 🔧 Configurações básicas
dotenv.config();
const app = express();

// ==============================
// 🗂️ Configuração de Views e Public
// ==============================
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(expressLayouts);
app.use(express.static(path.join(__dirname, "public")));
app.set("layout", "layout"); // layout padrão

// ==============================
// 📦 Middlewares
// ==============================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: process.env.SESSION_SECRET || "tigerfysecret",
    resave: false,
    saveUninitialized: false,
  })
);

// ==============================
// 🌐 Banco de Dados MongoDB
// ==============================
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB conectado!"))
  .catch((err) => console.error("❌ Erro ao conectar MongoDB:", err));

// ==============================
// 🧭 Rotas Principais
// ==============================

// Página inicial → redireciona pro deck
app.get("/", (req, res) => res.redirect("/deck"));

// Dashboard principal
app.get("/deck", (req, res) =>
  res.render("deck", { title: "Estatísticas Gerais", active: "deck" })
);

// Ofertas
app.get("/bots", (req, res) =>
  res.render("bots", { title: "Ofertas", active: "bots" })
);

// Adquirentes (API PIX)
app.get("/api_pix", (req, res) =>
  res.render("api_pix", { title: "Adquirentes", active: "api_pix" })
);

// Conquistas
app.get("/conquistas", (req, res) =>
  res.render("conquistas", { title: "Conquistas", active: "conquistas" })
);

// Perfil do usuário
app.get("/perfil", (req, res) =>
  res.render("perfil", { title: "Meu Perfil", active: "perfil" })
);

// Página de login (exemplo)
app.get("/login", (req, res) =>
  res.render("login", { title: "Login - TigerFy", active: "" })
);

// ==============================
// 🚀 Servidor
// ==============================
const PORT = process.env.PORT || 10000;
app.listen(PORT, () =>
  console.log(`🚀 Servidor online na porta ${PORT}\n✅ TigerFy pronto!`)
);
