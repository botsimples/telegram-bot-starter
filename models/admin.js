import express from "express";
import mongoose from "mongoose";

const router = express.Router();

// === MODELOS DO BANCO ===
const Plan = mongoose.model(
  "Plan",
  new mongoose.Schema({
    name: String,
    price: Number,
    description: String,
  })
);

const Button = mongoose.model(
  "Button",
  new mongoose.Schema({
    text: String,
    action: String,
    value: String,
  })
);

const Gateway = mongoose.model(
  "Gateway",
  new mongoose.Schema({
    nome: String,
    clientId: String,
    clientSecret: String,
    token: String,
    ativo: { type: Boolean, default: false },
  })
);

// === PAINEL PRINCIPAL ===
router.get("/", async (req, res) => {
  try {
    const plans = await Plan.find();
    const buttons = await Button.find();
    const gateways = await Gateway.find();
    res.render("admin", { plans, buttons, gateways });
  } catch (error) {
    console.error("Erro ao carregar painel:", error);
    res.status(500).send("Erro ao carregar painel admin");
  }
});

// === CRUD PLANOS ===
router.post("/admin/plan/create", async (req, res) => {
  await Plan.create(req.body);
  res.redirect("/");
});

router.post("/admin/plan/edit", async (req, res) => {
  await Plan.findByIdAndUpdate(req.body.id, req.body);
  res.redirect("/");
});

router.post("/admin/plan/delete", async (req, res) => {
  await Plan.findByIdAndDelete(req.body.id);
  res.redirect("/");
});

// === CRUD BOTÕES ===
router.post("/admin/button/create", async (req, res) => {
  await Button.create(req.body);
  res.redirect("/");
});

router.post("/admin/button/edit", async (req, res) => {
  await Button.findByIdAndUpdate(req.body.id, req.body);
  res.redirect("/");
});

router.post("/admin/button/delete", async (req, res) => {
  await Button.findByIdAndDelete(req.body.id);
  res.redirect("/");
});

// === CRUD GATEWAYS ===
router.post("/admin/gateway/create", async (req, res) => {
  await Gateway.create(req.body);
  res.redirect("/");
});

router.post("/admin/gateway/update", async (req, res) => {
  await Gateway.findByIdAndUpdate(req.body.id, req.body);
  res.redirect("/");
});

router.post("/admin/gateway/ativar", async (req, res) => {
  await Gateway.updateMany({}, { ativo: false }); // desativa todos
  await Gateway.findByIdAndUpdate(req.body.id, { ativo: true }); // ativa o escolhido
  res.redirect("/");
});

// === ROTAS FIXAS PARA LOGIN E ADMIN ===
router.get("/login", (req, res) => {
  res.render("dashboard", {
    title: "Login Painel",
    message: "Login temporário ativo",
  });
});

router.get("/admin", async (req, res) => {
  try {
    const plans = await Plan.find();
    const buttons = await Button.find();
    const gateways = await Gateway.find();
    res.render("admin", {
      title: "Painel Admin",
      message: "Mongo conectado e painel ativo!",
      plans,
      buttons,
      gateways,
    });
  } catch (error) {
    console.error("Erro ao abrir /admin:", error);
    res.status(500).send("Erro ao carregar /admin");
  }
});

export default router;
