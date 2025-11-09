import express from "express";
import mongoose from "mongoose";
import Plan from "./Plan.js";

const router = express.Router();

// === LOGIN E SESSÃO ===
router.get("/login", (req, res) => res.render("login"));

router.post("/login", (req, res) => {
  const { username, password } = req.body;
  if (
    username === process.env.ADMIN_USER &&
    password === process.env.ADMIN_PASS
  ) {
    req.session.loggedIn = true;
    return res.redirect("/admin");
  }
  res.send("❌ Usuário ou senha incorretos!");
});

router.use((req, res, next) => {
  if (req.session.loggedIn || req.path === "/login") return next();
  return res.redirect("/login");
});

// === DASHBOARD ===
router.get("/admin", async (req, res) => {
  const Plan = mongoose.models.Plan || (await import("./Plan.js")).default;
  const Gateway =
    mongoose.models.Gateway || (await import("./Gateway.js")).default;
  const planos = await Plan.find();
  const gateways = await Gateway.find();
  res.render("admin", { planos, gateways });
});

// === CRUD DE PLANOS ===

// Criar plano
router.post("/admin/planos", async (req, res) => {
  try {
    const { name, price, description, deliverable } = req.body;
    const Plan = mongoose.models.Plan || (await import("./Plan.js")).default;
    const plano = new Plan({ name, price, description, deliverable });
    await plano.save();
    res.json({ success: true, id: plano._id });
  } catch (err) {
    console.error("❌ Erro ao criar plano:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Atualizar plano
router.put("/admin/planos/:id", async (req, res) => {
  try {
    const { name, price, description, deliverable } = req.body;
    const Plan = mongoose.models.Plan || (await import("./Plan.js")).default;
    const plano = await Plan.findById(req.params.id);
    if (!plano) return res.status(404).json({ success: false });

    plano.name = name;
    plano.price = price;
    plano.description = description;
    plano.deliverable = deliverable;

    await plano.save();
    res.json({ success: true });
  } catch (err) {
    console.error("❌ Erro ao atualizar plano:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Excluir plano
router.delete("/admin/planos/:id", async (req, res) => {
  try {
    const Plan = mongoose.models.Plan || (await import("./Plan.js")).default;
    await Plan.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error("❌ Erro ao excluir plano:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// === CRUD DE GATEWAYS ===
router.post("/admin/gateways", async (req, res) => {
  try {
    const Gateway =
      mongoose.models.Gateway || (await import("./Gateway.js")).default;
    const { name, clientId, clientSecret, token } = req.body;
    const gateway = new Gateway({ name, clientId, clientSecret, token });
    await gateway.save();
    res.json({ success: true });
  } catch (err) {
    console.error("❌ Erro ao criar gateway:", err);
    res.status(500).json({ success: false });
  }
});

router.put("/admin/gateways/:id", async (req, res) => {
  try {
    const Gateway =
      mongoose.models.Gateway || (await import("./Gateway.js")).default;
    const { clientId, clientSecret, token } = req.body;
    const gw = await Gateway.findById(req.params.id);
    if (!gw) return res.status(404).json({ success: false });

    gw.clientId = clientId;
    gw.clientSecret = clientSecret;
    gw.token = token;
    await gw.save();

    res.json({ success: true });
  } catch (err) {
    console.error("❌ Erro ao atualizar gateway:", err);
    res.status(500).json({ success: false });
  }
});

router.post("/admin/gateways/ativar/:id", async (req, res) => {
  try {
    const Gateway =
      mongoose.models.Gateway || (await import("./Gateway.js")).default;
    await Gateway.updateMany({}, { active: false });
    await Gateway.findByIdAndUpdate(req.params.id, { active: true });
    res.json({ success: true });
  } catch (err) {
    console.error("❌ Erro ao ativar gateway:", err);
    res.status(500).json({ success: false });
  }
});

export default router;
