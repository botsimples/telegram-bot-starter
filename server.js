import express from "express";
import mongoose from "mongoose";
import session from "express-session";
import expressLayouts from "express-ejs-layouts";
import adminRoutes from "./models/admin.js";

const app = express();
const PORT = process.env.PORT || 10000;

/* ============================
   CONFIGURAÇÃO BÁSICA
============================ */
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("public"));

/* ============================
   SESSÃO
============================ */
app.use(
  session({
    secret: process.env.SESSION_SECRET || "tigerfy_secret_key",
    resave: false,
    saveUninitialized: true,
  })
);

/* ============================
   EJS + LAYOUTS
============================ */
app.set("view engine", "ejs");
app.set("views", "./views");
app.use(expressLayouts);
app.set("layout", "layout");

/* ============================
   CONEXÃO MONGODB
============================ */
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB conectado!"))
  .catch((err) => console.error("❌ Erro MongoDB:", err));

/* ============================
   ROTAS PRINCIPAIS
============================ */
app.get("/", (req, res) => {
  res.redirect("/deck");
});

app.get("/deck", (req, res) => {
  res.render("deck", { title: "Deck - TigerFy" });
});

app.get("/bots", (req, res) => {
  res.render("bots", { title: "Ofertas - TigerFy" });
});

app.get("/api_pix", (req, res) => {
  res.render("api_pix", { title: "Adquirentes - TigerFy" });
});

/* Rotas Admin */
app.use("/", adminRoutes);

/* ============================
   PÁGINA 404 PERSONALIZADA
============================ */
app.use((req, res) => {
  try {
    res.status(404).render("404", {
      title: "Página não encontrada - TigerFy",
      message: "A página solicitada não existe.",
    });
  } catch {
    res.status(404).send("404 - Página não encontrada");
  }
});

/* ============================
   SERVIDOR ONLINE
============================ */
app.listen(PORT, () => {
  console.log("🚀 Servidor online na porta " + PORT);
});
