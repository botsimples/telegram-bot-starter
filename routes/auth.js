const express = require("express");
const router = express.Router();
const Admin = require("../models/admin");
const bcrypt = require("bcrypt");

// ===== LOGIN =====
router.get("/login", (req, res) => {
  res.render("login", { title: "Login - TigerFy", message: "" });
});

router.post("/login", async (req, res) => {
  try {
    const { user, pass } = req.body;
    const admin = await Admin.findOne({ username: user });

    if (!admin) {
      return res.render("login", {
        title: "Login - TigerFy",
        message: "Usuário inexistente",
      });
    }

    const valid = await bcrypt.compare(pass, admin.password);
    if (!valid) {
      return res.render("login", {
        title: "Login - TigerFy",
        message: "Senha incorreta",
      });
    }

    req.session.userId = admin._id;
    return res.redirect("/deck");
  } catch (err) {
    console.error("Erro login:", err);
    return res.render("login", {
      title: "Login - TigerFy",
      message: "Erro inesperado",
    });
  }
});

// ===== REGISTER =====
router.get("/register", (req, res) => {
  res.render("register", { title: "Registrar - TigerFy" });
});

router.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    const exists = await Admin.findOne({ username });
    if (exists) {
      return res.render("register", {
        title: "Registrar - TigerFy",
        message: "Usuário já existe",
      });
    }

    const hash = await bcrypt.hash(password, 10);

    const admin = await Admin.create({
      username,
      email,
      password: hash,
    });

    req.session.userId = admin._id;

    return res.redirect("/deck");
  } catch (err) {
    console.error("Erro register:", err);
    res.render("register", {
      title: "Registrar - TigerFy",
      message: "Erro ao registrar",
    });
  }
});

// ===== LOGOUT =====
router.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/login");
});

module.exports = router;
