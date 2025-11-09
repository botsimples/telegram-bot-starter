import express from "express";
import mongoose from "mongoose";
import session from "express-session";
import expressLayouts from "express-ejs-layouts";
import adminRoutes from "./models/admin.js";

const app = express();
const PORT = process.env.PORT || 10000;

/* Middleware padrão */
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("public"));

/* Sessão */
app.use(
  session({
    secret: process.env.SESSION_SECRET || "botsimples_secret",
    resave: false,
    saveUninitialized: true,
  })
);

/* EJS + Layouts */
app.set("view engine", "ejs");
app.set("views", "./views");
app.use(expressLayouts);
app.set("layout", "layout");

/* MongoDB */
mongoose
  .connect(process.env.MONGO_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB conectado!"))
  .catch((err) => console.error("❌ Erro MongoDB:", err));

/* Rotas principais */
app.use("/", adminRoutes);

/* Página 404 */
app.use((req, res) => {
  res.status(404).render("404", {
    title: "Página não encontrada",
    message: "A página solicitada não existe.",
  });
});

/* Inicialização */
app.listen(PORT, () => {
  console.log(`🚀 Servidor online na porta ${PORT}`);
});
