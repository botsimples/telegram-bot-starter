import express from "express";
import mongoose from "mongoose";

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

// === ROTA PRINCIPAL DO PAINEL ===
router.get(["/", "/admin"], async (req, res) => {
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
router.post("/admin/planos", async (req, res) => {
  const { name, price, description } = req.body;
  try {
    await Plan.create({ name, price, description });
    res.sendStatus(200);
  } catch (err) {
    console.error("❌ Erro ao criar plano:", err.message);
    res.status(500).send(err.message);
  }
});

router.put("/admin/planos/:id", async (req, res) => {
  try {
    await Plan.findByIdAndUpdate(req.params.id, req.body);
    res.sendStatus(200);
  } catch (err) {
    console.error("❌ Erro ao atualizar plano:", err.message);
    res.status(500).send(err.message);
  }
});

router.delete("/admin/planos/:id", async (req, res) => {
  try {
    await Plan.findByIdAndDelete(req.params.id);
    res.sendStatus(200);
  } catch (err) {
    console.error("❌ Erro ao excluir plano:", err.message);
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
    console.error("❌ Erro ao criar gateway:", err.message);
    res.status(500).send(err.message);
  }
});

router.put("/admin/gateways/:id", async (req, res) => {
  try {
    await Gateway.findByIdAndUpdate(req.params.id, req.body);
    res.sendStatus(200);
  } catch (err) {
    console.error("❌ Erro ao atualizar gateway:", err.message);
    res.status(500).send(err.message);
  }
});

router.post("/admin/gateways/ativar/:id", async (req, res) => {
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
