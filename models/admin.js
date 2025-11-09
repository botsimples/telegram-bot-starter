import express from "express";
import mongoose from "mongoose";

const router = express.Router();

// === MODELOS ===
const Plan = mongoose.models.Plan || mongoose.model(
  "Plan",
  new mongoose.Schema({
    name: String,
    price: Number,
    description: String,
    deliverable: String, // 🔥 link ou texto pós-pagamento
  })
);

const Gateway = mongoose.models.Gateway || mongoose.model(
  "Gateway",
  new mongoose.Schema({
    name: String,
    clientId: String,
    clientSecret: String,
    token: String,
    active: { type: Boolean, default: false },
  })
);

// === ROTA LOGIN ===
router.get("/login", (req, res) => {
  res.render("login", { message: "Acesse com sua senha de administrador" });
});

// === ROTA ADMIN PRINCIPAL ===
router.get("/admin", async (req, res) => {
  try {
    const planos = await Plan.find();
    const gateways = await Gateway.find();
    res.render("admin", { planos, gateways });
  } catch (err) {
    console.error("❌ Erro ao carregar painel admin:", err);
    res.status(500).send("Erro ao carregar painel.");
  }
});

// === CRUD PLANOS ===
router.post("/plan/update/:id", async (req, res) => {
  try {
    const { name, price, description, deliverable } = req.body;
    const Plan = mongoose.models.Plan || (await import("./Plan.js")).default;

    const plano = await Plan.findById(req.params.id);
    if (!plano) return res.status(404).send("Plano não encontrado.");

    plano.name = name || plano.name;
    plano.price = price || plano.price;
    plano.description = description || plano.description;
    plano.deliverable = deliverable || plano.deliverable;

    await plano.save();
    res.redirect("/admin");
  } catch (err) {
    console.error("Erro ao atualizar plano:", err.message);
    res.status(500).send("Erro ao atualizar plano.");
  }
});


router.put("/admin/planos/:id", async (req, res) => {
  try {
    await Plan.findByIdAndUpdate(req.params.id, req.body);
    res.sendStatus(200);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

router.delete("/admin/planos/:id", async (req, res) => {
  try {
    await Plan.findByIdAndDelete(req.params.id);
    res.sendStatus(200);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// === CRUD GATEWAYS ===
router.post("/admin/gateways", async (req, res) => {
  const { name, clientId, clientSecret, token } = req.body;
  try {
    await Gateway.create({ name, clientId, clientSecret, token });
    res.sendStatus(200);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

router.put("/admin/gateways/:id", async (req, res) => {
  try {
    await Gateway.findByIdAndUpdate(req.params.id, req.body);
    res.sendStatus(200);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

router.post("/admin/gateways/ativar/:id", async (req, res) => {
  try {
    await Gateway.updateMany({}, { active: false });
    await Gateway.findByIdAndUpdate(req.params.id, { active: true });
    res.sendStatus(200);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

export default router;
