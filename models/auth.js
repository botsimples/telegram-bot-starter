import express from "express";
const router = express.Router();

router.get("/login", (req, res) => {
  if (req.session.user) return res.redirect("/admin");
  res.send(`
    <body style="background:#000;color:#fff;text-align:center;padding:60px;font-family:sans-serif">
      <h1>🔐 Login Painel BotSimples</h1>
      <form method="POST" action="/login" style="margin-top:20px">
        <input name="user" placeholder="Usuário" style="padding:8px;margin:5px;border:none">
        <input name="pass" type="password" placeholder="Senha" style="padding:8px;margin:5px;border:none">
        <button type="submit" style="padding:8px 16px;background:#ffb347;border:none;cursor:pointer">Entrar</button>
      </form>
    </body>
  `);
});

router.post("/login", (req, res) => {
  const { user, pass } = req.body;
  if (user === process.env.ADMIN_USER && pass === process.env.ADMIN_PASS) {
    req.session.user = user;
    return res.redirect("/admin");
  }
  res.send("<h2 style='color:red'>❌ Login incorreto</h2>");
});

router.get("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/login"));
});

export default router;
