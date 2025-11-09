import express from "express";
import mongoose from "mongoose";
import Plan from "./Plan.js";
import Bot from "./Bot.js";
import ApiPix from "./ApiPix.js";

const router = express.Router();

/* === LOGIN === */
router.get("/login", (req, res) => {
  res.render("login", { message: "" });
});

router.post("/login", (req, res) => {
  const { username, password } = req.body;
  // autenticação fake só pra não quebrar
  if (username === "admin" && password === "123") {
    res.redirect("/admin");
  } else {
    res.render("login", { message: "Credenciais inválidas" });
  }
});

/* === DASHBOARD === */
router.get("/", async (req, res) => {
  try {
    const planos = await Plan.find().sort({ createdAt: -1 });
    const users = [];
    const payments = [];
    res.render("dashboard", { planos, users, payments });
  } catch (err) {
    console.error("Erro ao carregar dashboard:", err.message);
    res.status(500).send("Erro ao carregar dashboard.");
  }
});

/* === ADMIN (PLANOS E GATEWAYS) === */
router.get("/admin", async (req, res) => {
  try {
    const planos = await Plan.find().sort({ createdAt: -1 });
    const gateways = await ApiPix.find().sort({ createdAt: -1 });
    res.render("admin", { planos, gateways });
  } catch (err) {
    console.error("Erro ao carregar admin:", err.message);
    res.status(500).send("Erro ao carregar admin.");
  }
});

/* === CRUD PLANOS === */
router.post("/admin/add-plan", async (req, res) => {
  try {
    const { name, price, description, deliverable } = req.body;
    await Plan.create({ name, price, description, deliverable });
    res.redirect("/admin");
  } catch (err) {
    console.error("Erro ao adicionar plano:", err.message);
    res.status(500).send("Erro ao adicionar plano.");
  }
});

router.post("/admin/delete-plan/:id", async (req, res) => {
  try {
    await Plan.findByIdAndDelete(req.params.id);
    res.redirect("/admin");
  } catch (err) {
    console.error("Erro ao deletar plano:", err.message);
    res.status(500).send("Erro ao deletar plano.");
  }
});

/* === BOTS === */
router.get("/bots", async (req, res) => {
  try {
    const bots = await Bot.find().sort({ createdAt: -1 });
    res.render("bots", { bots });
  } catch (err) {
    console.error("Erro ao carregar bots:", err.message);
    res.status(500).send("Erro ao carregar bots.");
  }
});

router.post("/bots/add", async (req, res) => {
  try {
    const { username, token, note } = req.body;
    await Bot.create({ username, token, note });
    res.redirect("/bots");
  } catch (err) {
    console.error("Erro ao adicionar bot:", err.message);
    res.status(500).send("Erro ao adicionar bot.");
  }
});

router.post("/bots/delete/:id", async (req, res) => {
  try {
    await Bot.findByIdAndDelete(req.params.id);
    res.redirect("/bots");
  } catch (err) {
    console.error("Erro ao deletar bot:", err.message);
    res.status(500).send("Erro ao deletar bot.");
  }
});

/* === API PIX === */
router.get("/api-pix", async (req, res) => {
  try {
    const apipix = await ApiPix.findOne().sort({ createdAt: -1 }) || { gateways: [] };
    res.render("api_pix", { apipix });
  } catch (err) {
    console.error("Erro ao carregar API PIX:", err.message);
    res.status(500).send("Erro ao carregar API PIX.");
  }
});

router.post("/api-pix/add", async (req, res) => {
  try {
    const { provider, key, secret } = req.body;
    await ApiPix.create({ provider, key, secret });
    res.redirect("/api-pix");
  } catch (err) {
    console.error("Erro ao adicionar API PIX:", err.message);
    res.status(500).send("Erro ao adicionar API PIX.");
  }
});

export default router;
