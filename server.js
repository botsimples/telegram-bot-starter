const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const path = require("path");
const compression = require("compression");
const helmet = require("helmet");
const morgan = require("morgan");
const expressLayouts = require("express-ejs-layouts");
require("dotenv").config();

const app = express();

// --- MIDDLEWARES BÁSICOS ---
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(compression());
app.use(helmet());
app.use(morgan("tiny"));

// --- SESSÃO ---
app.use(
  session({
    secret: process.env.SESSION_SECRET || "tigerfy_secret",
    resave: false,
    saveUninitialized: false,
  })
);

// --- VARIÁVEIS GLOBAIS PARA AS VIEWS ---
// aqui garantimos que NUNCA vai dar "active is not defined" ou "userId is not defined"
app.use((req, res, next) => {
  res.locals.active = "";                    // usado no menu lateral
  res.locals.userId = req.session.userId || null; // usado no layout.ejs para saber se mostra a sidebar
  next();
});

// --- EJS + LAYOUT ---
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.set("layout", "layout");
app.use(expressLayouts);

// --- ARQUIVOS ESTÁTICOS ---
app.use(express.static(path.join(__dirname, "public")));

// --- MONGO ---
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB conectado!"))
  .catch((err) => console.error("Erro MongoDB:", err));

// --- ROTAS ---
app.use("/", require("./routes/auth"));        // login, register, logout
app.use("/", require("./routes/dashboard"));   // /deck
app.use("/", require("./routes/offers"));      // /bots, /bots/create etc
app.use("/", require("./routes/api_pix"));     // /api_pix

// (⚠️ IMPORTANTE: repare que NÃO TEM mais require("./routes/bots"))

// --- 404 ---
app.use((req, res) => {
  res.status(404).render("404", { title: "404 - TigerFy" });
});

// --- START ---
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 TigerFy rodando! Porta ${PORT}`);
});
