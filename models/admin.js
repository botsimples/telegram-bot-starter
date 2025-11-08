import express from "express";
import mongoose from "mongoose";
import session from "express-session";

const router = express.Router();

// === MODELOS ===
const Plan =
  mongoose.models.Plan ||
  mongoose.model(
    "Plan",
    new mongoose.Schema({
      name: String,
      price: Number,
      description: String,
    })
  );

const Gateway =
  mongoose.models.Gateway ||
  mongoose.model(
    "Gateway",
    new mongoose.Schema({
      name: String,
      clientId: String,
      clientSecret: String,
      token: String,
      active: { type: Boolean, default: false },
    })
  );

// === MIDDLEWARE DE SESSÃO ===
router.use(
  session({
    secret: process.env.SESSION_SECRET || "painel-botsimples",
    resave: false,
    saveUninitialized: false,
  })
);

// === MIDDLEWARE DE AUTENTICAÇÃO ===
function verificarLogin(req, res, next) {
  if (req.session.logado) return next();
  res.redirect("/login");
}

// === LOGIN ===
router.get("/login", (req, res) => {
  res.render("login");
});

router.post("/login", (req, res) => {
  const { username, password } = req.body;

  const ADMIN_USER = process.env.ADMIN_USER || "admin";
  const ADMIN_PASS = process.env.ADMIN_PASS || "1234";

  if (username === ADMIN_USER && password === ADMIN_PASS) {
    req.session.logado = true;
    return res.redirect("/admin");
  }

  res.render("login", { erro: "Usuário ou senha incorretos." });
});

// === LOGOUT ===
router.get("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/login"));
});

// === ROTA PRINCIPAL DO PAINEL ===
router.get(["/", "/admin"], verificarLogin, async (req, res) => {
  try {
    const planos = (await Plan.find()) || [];
    const gateways = (await Gateway.find()) || [];
    res.render("admin", { planos, gateways });
  } catch (err) {
    console.error("❌ Erro ao carregar painel admin:", err.message);
    res.render("admin", { planos: [], gateways: [] });
  }
});

// === CRUD PLANOS ===
router.post("/admin/planos", verificarLogin, async (req, res) => {
  const { name, price, description } = req.body;
  try {
    await Plan.create({ name, price, description });
    res.sendStatus(200);
  } catch (err) {
    console.error("❌ Erro ao criar plano:", err.message);
    res.status(500).send(err.message);
  }
});

router.put("/admin/planos/:id", verificarLogin, async (req, res) => {
  try {
    await Plan.findByIdAndUpdate(req.params.id, req.body);
    res.sendStatus(200);
  } catch (err) {
    console.error("❌ Erro ao atualizar plano:", err.message);
    res.status(500).send(err.message);
  }
});

router.delete("/admin/planos/:id", verificarLogin, async (req, res) => {
  try {
    await Plan.findByIdAndDelete(req.params.id);
    res.sendStatus(200);
  } catch (err) {
    console.error("❌ Erro ao excluir plano:", err.message);
    res.status(500).send(err.message);
  }
});

// === CRUD GATEWAYS ===
router.post("/admin/gateways", verificarLogin, async (req, res) => {
  const { name, clientId, clientSecret, token } = req.body;
  try {
    await Gateway.create({ name, clientId, clientSecret, token });
    res.sendStatus(200);
  } catch (err) {
    console.error("❌ Erro ao criar gateway:", err.message);
    res.status(500).send(err.message);
  }
});

router.put("/admin/gateways/:id", verificarLogin, async (req, res) => {
  try {
    await Gateway.findByIdAndUpdate(req.params.id, req.body);
    res.sendStatus(200);
  } catch (err) {
    console.error("❌ Erro ao atualizar gateway:", err.message);
    res.status(500).send(err.message);
  }
});

router.post("/admin/gateways/ativar/:id", verificarLogin, async (req, res) => {
  try {
    await Gateway.updateMany({}, { active: false });
    await Gateway.findByIdAndUpdate(req.params.id, { active: true });
    res.sendStatus(200);
  } catch (err) {
    console.error("❌ Erro ao ativar gateway:", err.message);
    res.status(500).send(err.message);
  }
});

export default router;
