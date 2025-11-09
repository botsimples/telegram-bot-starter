import express from "express";
import mongoose from "mongoose";
import session from "express-session";
import path from "path";
import expressLayouts from "express-ejs-layouts";
import adminRoutes from "./models/admin.js"; // ajuste se seu admin.js estiver em outra pasta

const app = express();
const PORT = process.env.PORT || 10000;

/* === CONFIGURAÇÕES GERAIS === */
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("public"));

/* === SESSÃO === */
app.use(
  session({
    secret: "botsimples_secret_key",
    resave: false,
    saveUninitialized: true,
  })
);

/* === VIEW ENGINE (EJS + LAYOUTS) === */
app.set("view engine", "ejs");
app.set("views", "./views");
app.use(expressLayouts);
app.set("layout", "layout"); // usa layout.ejs como base automática

/* === MONGO DB === */
mongoose
  .connect(process.env.MONGO_URL || "mongodb+srv://seu_link_aqui", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB conectado com sucesso!"))
  .catch((err) => console.error("❌ Erro MongoDB:", err));

/* === ROTAS === */
app.use("/", adminRoutes);

/* === ERRO 404 === */
app.use((req, res) => {
  res.status(404).render("404", {
    title: "Página não encontrada",
    message: "A página solicitada não existe.",
  });
});

/* === INICIALIZAÇÃO === */
app.listen(PORT, () =>
  console.log(`🚀 Servidor rodando na porta ${PORT}`)
);
