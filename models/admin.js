import express from "express";
import mongoose from "mongoose";

const router = express.Router();

// === MODELOS ===
const Plan = mongoose.models.Plan || mongoose.model("Plan", new mongoose.Schema({
  name: String,
  price: Number,
  description: String,
  deliverable: String,
}));

const Gateway = mongoose.models.Gateway || mongoose.model("Gateway", new mongoose.Schema({
  name: String,
  clientId: String,
  clientSecret: String,
  token: String,
  active: { type: Boolean, default: false },
}));

// === LOGIN ===
router.get("/login", (req, res) => {
  res.render("login", { message: "" });
});

router.post("/login", (req, res) => {
  const { username, password } = req.body;
  if (
    username === process.env.ADMIN_USER &&
    password === process.env.ADMIN_PASS
  ) {
    req.session.loggedIn = true;
    return res.redirect("/admin");
  }
  res.render("login", { message: "❌ Usuário ou senha incorretos!" });
});

// === PROTEÇÃO DE ROTAS ===
router.use((req, res, next) => {
  if (!req.session.loggedIn && req.path !== "/login") {
    return res.redirect("/login");
  }
  next();
});

// === PAINEL ADMIN ===
router.get("/admin", async (req, res) => {
  const planos = await Plan.find();
  const gateways = await Gateway.find();
  res.render("admin", { planos, gateways });
});

// === CRUD PLANOS ===
router.post("/admin/planos", async (req, res) => {
  try {
    let { name, price, description, deliverable } = req.body;
    price = parseFloat(String(price).replace(",", "."));
    await Plan.create({ name, price, description, deliverable });
    res.sendStatus(200);
  } catch (err) {
    console.error("❌ Erro ao criar plano:", err);
    res.status(500).send("Erro ao criar plano.");
  }
});

router.put("/admin/planos/:id", async (req, res) => {
  try {
    const { id } = req.params;
    let { name, price, description, deliverable } = req.body;
    price = parseFloat(String(price).replace(",", "."));
    await Plan.findByIdAndUpdate(id, { name, price, description, deliverable });
    res.sendStatus(200);
  } catch (err) {
    console.error("❌ Erro ao atualizar plano:", err);
    res.status(500).send("Erro ao atualizar plano.");
  }
});

router.delete("/admin/planos/:id", async (req, res) => {
  await Plan.findByIdAndDelete(req.params.id);
  res.sendStatus(200);
});

// === CRUD GATEWAYS ===
router.post("/admin/gateways", async (req, res) => {
  const { name, clientId, clientSecret, token } = req.body;
  await Gateway.create({ name, clientId, clientSecret, token });
  res.sendStatus(200);
});

router.put("/admin/gateways/:id", async (req, res) => {
  const { id } = req.params;
  const { clientId, clientSecret, token } = req.body;
  await Gateway.findByIdAndUpdate(id, { clientId, clientSecret, token });
  res.sendStatus(200);
});

router.post("/admin/gateways/ativar/:id", async (req, res) => {
  await Gateway.updateMany({}, { active: false });
  await Gateway.findByIdAndUpdate(req.params.id, { active: true });
  res.sendStatus(200);
});

export default router;
