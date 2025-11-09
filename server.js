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
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB conectado!"))
  .catch((err) => console.error("❌ Erro MongoDB:", err));

/* ============================
   ROTAS PRINCIPAIS
============================ */
app.use("/", adminRoutes);

/* ============================
   PÁGINA 404 PERSONALIZADA
============================ */
app.use((req, res) => {
  res.status(404).render("404", {
    title: "Página não encontrada - TigerFy",
    active: "",
    message: "A página solicitada não existe.",
  });
});

/* ============================
   SERVIDOR ONLINE
============================ */
app.listen(PORT, () => {
  console.log(`🚀 Servidor online na porta ${PORT}`);
});
