import express from "express";
import mongoose from "mongoose";
import session from "express-session";

const router = express.Router();

/* ========= MODELOS ========= */
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

/* ========= SESSÃO ========= */
router.use(
  session({
    secret: process.env.SESSION_SECRET || "painel-botsimples",
    resave: false,
    saveUninitialized: false,
  })
);

/* ========= GUARD (exige login no /admin) ========= */
function requireLogin(req, res, next) {
  if (req.session?.logado) return next();
  return res.redirect("/login");
}

/* ========= LOGIN ========= */
router.get("/login", (_req, res) => {
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
  return res.render("login", { erro: "Usuário ou senha incorretos." });
});

router.get("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/login"));
});

/* ========= PAINEL ========= */
router.get("/admin", requireLogin, async (_req, res) => {
  try {
    const planos = (await Plan.find()) || [];
    const gateways = (await Gateway.find()) || [];
    res.render("admin", {
      planos,
      gateways,
      usuario: process.env.ADMIN_USER || "admin",
    });
  } catch (err) {
    console.error("❌ Erro ao carregar admin:", err.message);
    res.render("admin", {
      planos: [],
      gateways: [],
      usuario: process.env.ADMIN_USER || "admin",
    });
  }
});

/* ========= CRUD PLANOS ========= */
router.post("/admin/planos", requireLogin, async (req, res) => {
  const { name, price, description } = req.body;
  await Plan.create({ name, price, description });
  res.sendStatus(200);
});

router.put("/admin/planos/:id", requireLogin, async (req, res) => {
  await Plan.findByIdAndUpdate(req.params.id, req.body);
  res.sendStatus(200);
});

router.delete("/admin/planos/:id", requireLogin, async (req, res) => {
  await Plan.findByIdAndDelete(req.params.id);
  res.sendStatus(200);
});

/* ========= CRUD GATEWAYS ========= */
router.post("/admin/gateways", requireLogin, async (req, res) => {
  const { name, clientId, clientSecret, token } = req.body;
  await Gateway.create({ name, clientId, clientSecret, token });
  res.sendStatus(200);
});

router.put("/admin/gateways/:id", requireLogin, async (req, res) => {
  await Gateway.findByIdAndUpdate(req.params.id, req.body);
  res.sendStatus(200);
});

router.post("/admin/gateways/ativar/:id", requireLogin, async (req, res) => {
  await Gateway.updateMany({}, { active: false });
  await Gateway.findByIdAndUpdate(req.params.id, { active: true });
  res.sendStatus(200);
});

export default router;
