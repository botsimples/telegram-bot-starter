import express from "express";
import Plan from "./Plan.js";
import Bot from "./Bot.js";
import ApiPix from "./ApiPix.js";

const router = express.Router();

/* === LOGIN === */
router.get("/login", (req, res) => {
  res.render("login", { title: "Login - TigerFy", message: "", active: "" });
});

router.post("/login", (req, res) => {
  const { username, password } = req.body;

  if (username === "admin" && password === "123") {
    return res.redirect("/deck");
  } else {
    return res.render("login", {
      title: "Login - TigerFy",
      message: "Credenciais inválidas",
      active: "",
    });
  }
});

/* === DECK PRINCIPAL === */
router.get(["/", "/deck"], async (req, res) => {
  try {
    const planos = await Plan.find().sort({ createdAt: -1 });
    res.render("deck", {
      title: "Deck - TigerFy",
      planos,
      active: "deck",
    });
  } catch (err) {
    console.error("❌ Erro ao carregar deck:", err.message);
    res.status(500).send("Erro ao carregar deck.");
  }
});

/* === OFERTAS === */
router.get("/bots", async (req, res) => {
  try {
    const bots = await Bot.find().sort({ createdAt: -1 });
    res.render("bots", {
      title: "Ofertas - TigerFy",
      bots,
      active: "bots",
    });
  } catch (err) {
    console.error("❌ Erro ao carregar ofertas:", err.message);
    res.status(500).send("Erro ao carregar ofertas.");
  }
});

/* === ADQUIRENTES === */
router.get("/api_pix", async (req, res) => {
  try {
    const adquirentes = await ApiPix.find().sort({ createdAt: -1 });
    res.render("api_pix", {
      title: "Adquirentes - TigerFy",
      adquirentes,
      active: "api_pix",
    });
  } catch (err) {
    console.error("❌ Erro ao carregar adquirentes:", err.message);
    res.status(500).send("Erro ao carregar adquirentes.");
  }
});

/* === CRUD PLANOS === */
router.post("/admin/add-plan", async (req, res) => {
  try {
    const { name, price, description, deliverable } = req.body;
    await Plan.create({ name, price, description, deliverable });
    res.redirect("/deck");
  } catch (err) {
    console.error("❌ Erro ao adicionar plano:", err.message);
    res.status(500).send("Erro ao adicionar plano.");
  }
});

/* === CRUD BOTS === */
router.post("/bots/add", async (req, res) => {
  try {
    const { username, token, note } = req.body;
    await Bot.create({ username, token, note });
    res.redirect("/bots");
  } catch (err) {
    console.error("❌ Erro ao adicionar bot:", err.message);
    res.status(500).send("Erro ao adicionar bot.");
  }
});

router.post("/bots/delete/:id", async (req, res) => {
  try {
    await Bot.findByIdAndDelete(req.params.id);
    res.redirect("/bots");
  } catch (err) {
    console.error("❌ Erro ao deletar bot:", err.message);
    res.status(500).send("Erro ao deletar bot.");
  }
});

/* === CRUD API PIX === */
router.post("/api_pix/add", async (req, res) => {
  try {
    const { provider, key, secret } = req.body;
    await ApiPix.create({ provider, key, secret });
    res.redirect("/api_pix");
  } catch (err) {
    console.error("❌ Erro ao adicionar adquirente:", err.message);
    res.status(500).send("Erro ao adicionar adquirente.");
  }
});

export default router;
