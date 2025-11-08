import express from "express";
const router = express.Router();

// === ROTA LOGIN ===
router.get("/login", (req, res) => {
  res.render("admin");
});

// === ROTA DASHBOARD ===
router.get("/dashboard", (req, res) => {
  res.render("dashboard");
});

export default router;
