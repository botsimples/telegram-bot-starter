import express from "express";
import mongoose from "mongoose";
import Plan from "./Plan.js";
import Bot from "./bot.js";           // nosso schema acima
import ApiPix from "./ApiPix.js";     // nosso schema acima

const router = express.Router();

/* ===== Helpers ===== */
async function getOrCreateApiPix() {
  let doc = await ApiPix.findOne();
  if (!doc) doc = await ApiPix.create({ gateways: [], priority: {} });
  return doc;
}

/* ===== Dashboard (já existente) ===== */
router.get("/", async (req, res) => {
  const planos = await Plan.find().sort({ createdAt: -1 });
  res.render("dashboard", { planos });
});

/* ======== BOTS ======== */
router.get("/bots", async (req, res) => {
  const bots = await Bot.find().sort({ createdAt: -1 });
  res.render("bots", { bots });
});

router.post("/bots", async (req, res) => {
  try {
    const { username, token, note } = req.body;
    if (!username || !token) return res.status(400).json({ ok: false, msg: "username e token são obrigatórios" });
    const bot = await Bot.create({ username, token, note });
    res.json({ ok: true, bot });
  } catch (e) {
    res.status(500).json({ ok: false, msg: e.message });
  }
});

router.put("/bots/:id", async (req, res) => {
  try {
    const { username, token, note, isActive } = req.body;
    const bot = await Bot.findByIdAndUpdate(
      req.params.id,
      { username, token, note, isActive },
      { new: true }
    );
    res.json({ ok: true, bot });
  } catch (e) {
    res.status(500).json({ ok: false, msg: e.message });
  }
});

router.delete("/bots/:id", async (req, res) => {
  try {
    await Bot.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, msg: e.message });
  }
});

/* ======== API PIX ======== */
router.get("/api-pix", async (req, res) => {
  const apipix = await getOrCreateApiPix();
  res.render("api_pix", { apipix });
});

// criar gateway
router.post("/api-pix/gateways", async (req, res) => {
  try {
    const { name, clientId, clientSecret, token } = req.body;
    const apipix = await getOrCreateApiPix();
    apipix.gateways.push({ name, clientId, clientSecret, token, active: false });
    await apipix.save();
    res.json({ ok: true, apipix });
  } catch (e) {
    res.status(500).json({ ok: false, msg: e.message });
  }
});

// atualizar gateway
router.put("/api-pix/gateways/:gid", async (req, res) => {
  try {
    const { clientId, clientSecret, token, active } = req.body;
    const apipix = await getOrCreateApiPix();
    const gw = apipix.gateways.id(req.params.gid);
    if (!gw) return res.status(404).json({ ok: false, msg: "Gateway não encontrado" });
    if (clientId !== undefined) gw.clientId = clientId;
    if (clientSecret !== undefined) gw.clientSecret = clientSecret;
    if (token !== undefined) gw.token = token;
    if (active !== undefined) gw.active = !!active;
    await apipix.save();
    res.json({ ok: true, apipix });
  } catch (e) {
    res.status(500).json({ ok: false, msg: e.message });
  }
});

// excluir gateway
router.delete("/api-pix/gateways/:gid", async (req, res) => {
  try {
    const apipix = await getOrCreateApiPix();
    apipix.gateways.id(req.params.gid)?.deleteOne();
    await apipix.save();
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, msg: e.message });
  }
});

// salvar prioridade
router.post("/api-pix/priority", async (req, res) => {
  try {
    const { primary, secondary, tertiary } = req.body;
    const apipix = await getOrCreateApiPix();
    apipix.priority = { primary, secondary, tertiary };
    await apipix.save();
    res.json({ ok: true, apipix });
  } catch (e) {
    res.status(500).json({ ok: false, msg: e.message });
  }
});

/* ======== Planos (mantém o que já tinha) ======== */
router.get("/admin", async (req, res) => {
  const planos = await Plan.find().sort({ createdAt: -1 });
  const apipix = await getOrCreateApiPix();
  res.render("admin", { planos, gateways: apipix.gateways });
});

router.post("/admin/planos", async (req, res) => {
  try {
    let { name, price, description, deliverable } = req.body;
    price = parseFloat(String(price).replace(",", "."));
    const plan = await Plan.create({ name, price, description, deliverable });
    res.json({ ok: true, plan });
  } catch (e) {
    res.status(500).json({ ok: false, msg: e.message });
  }
});

router.put("/admin/planos/:id", async (req, res) => {
  try {
    let { name, price, description, deliverable } = req.body;
    if (price !== undefined) price = parseFloat(String(price).replace(",", "."));
    const plan = await Plan.findByIdAndUpdate(
      req.params.id,
      { name, price, description, deliverable },
      { new: true }
    );
    res.json({ ok: true, plan });
  } catch (e) {
    res.status(500).json({ ok: false, msg: e.message });
  }
});

router.delete("/admin/planos/:id", async (req, res) => {
  try {
    await Plan.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, msg: e.message });
  }
});

export default router;
