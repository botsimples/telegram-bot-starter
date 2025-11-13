const express = require("express");
const router = express.Router();
const Bot = require("../models/Bot");

function auth(req, res, next) {
  if (!req.session.userId) return res.redirect("/login");
  next();
}

router.post("/bots/add", auth, async (req, res) => {
  try {
    const { username, token, note } = req.body;

    await Bot.create({ username, token, note, owner: req.session.userId });

    res.redirect("/bots");
  } catch (err) {
    console.error("Erro add bot:", err);
    res.status(500).send("Erro ao adicionar bot.");
  }
});

router.post("/bots/delete/:id", auth, async (req, res) => {
  try {
    await Bot.deleteOne({ _id: req.params.id, owner: req.session.userId });
    res.redirect("/bots");
  } catch (err) {
    console.error("Erro delete bot:", err);
    res.status(500).send("Erro ao deletar bot.");
  }
});

module.exports = router;
