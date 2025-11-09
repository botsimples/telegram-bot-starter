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
  // autenticação simples
  if (username === "admin" && password === "123") {
    return res.redirect("/");
  } else {
    return res.render("login", { message: "Credenciais inválidas" });
  }
});

/* === DASHBOARD / DECK === */
router.get("/", async (req, res) => {
  try {
    const planos = await Plan.find().sort({ createdAt: -1 });
    const users = [];
    const payments = [];
    res.render("dashboard", { title: "Deck - BotSimples", planos, users, payments });
  } catch (err) {
    console.error("❌ Erro ao carregar dashboard:", err.message);
    res.status(500).send("Erro ao carregar dashboard.");
  }
});

/* === ADMIN (Planos e Gateways antigos, opcional) === */
router.get("/admin", async (req, res) => {
  try {
    const planos = await Plan.find().sort({ createdAt: -1 });
    const gateways = await ApiPix.find().sort({ createdAt: -1 });
    res.render("admin", { title: "Admin - BotSimples", planos, gateways });
  } catch (err) {
    console.error("❌ Erro ao carregar admin:", err.message);
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
    console.error("❌ Erro ao adicionar plano:", err.message);
    res.status(500).send("Erro ao adicionar plano.");
  }
});

router.post("/admin/delete-plan/:id", async (req, res) => {
  try {
    await Plan.findByIdAndDelete(req.params.id);
    res.redirect("/admin");
  } catch (err) {
    console.error("❌ Erro ao deletar plano:", err.message);
    res.status(500).send("Erro ao deletar plano.");
  }
});

/* === OFERTAS (ex-Bots) === */
router.get("/bots", async (req, res) => {
  try {
    const bots = await Bot.find().sort({ createdAt: -1 });
    res.render("bots", { title: "Ofertas - BotSimples", bots });
  } catch (err) {
    console.error("❌ Erro ao carregar ofertas:", err.message);
    res.status(500).send("Erro ao carregar ofertas.");
  }
});

router.post("/bots/add", async (req, res) => {
  try {
    const { username, token, note } = req.body;
    await Bot.create({ username, token, note });
    res.redirect("/bots");
  } catch (err) {
    console.error("❌ Erro ao adicionar oferta:", err.message);
    res.status(500).send("Erro ao adicionar oferta.");
  }
});

router.post("/bots/delete/:id", async (req, res) => {
  try {
    await Bot.findByIdAndDelete(req.params.id);
    res.redirect("/bots");
  } catch (err) {
    console.error("❌ Erro ao deletar oferta:", err.message);
    res.status(500).send("Erro ao deletar oferta.");
  }
});

/* === ADQUIRENTES (ex-API PIX) === */
router.get("/api_pix", async (req, res) => {
  try {
    const adquirentes = await ApiPix.find().sort({ createdAt: -1 });
    res.render("api_pix", { title: "Adquirentes - BotSimples", adquirentes });
  } catch (err) {
    console.error("❌ Erro ao carregar Adquirentes:", err.message);
    res.status(500).send("Erro ao carregar Adquirentes.");
  }
});

router.post("/api_pix/add", async (req, res) => {
  try {
    const { provider, key, secret } = req.body;
    await ApiPix.create({ provider, key, secret });
    res.redirect("/api_pix");
  } catch (err) {
    console.error("❌ Erro ao adicionar Adquirente:", err.message);
    res.status(500).send("Erro ao adicionar Adquirente.");
  }
});

export default router;
