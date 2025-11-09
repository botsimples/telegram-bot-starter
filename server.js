// server.js
const express = require('express');
const path = require('path');
const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// === ROTAS PRINCIPAIS ===

// Dashboard principal
app.get('/deck', (req, res) => {
  res.render('deck', { title: 'Dashboard', active: 'deck' });
});

// Ofertas / Bots
app.get('/bots', (req, res) => {
  res.render('bots', { title: 'Ofertas', active: 'bots' });
});

// Adquirentes / API PIX
app.get('/api_pix', (req, res) => {
  res.render('api_pix', { title: 'Adquirentes', active: 'api_pix' });
});

// Conquistas
app.get('/conquistas', (req, res) => {
  res.render('conquistas', { title: 'Conquistas', active: 'conquistas' });
});

// Perfil
app.get('/perfil', (req, res) => {
  res.render('perfil', { title: 'Meu Perfil', active: 'perfil' });
});

// Logout (simples)
app.get('/logout', (req, res) => {
  res.redirect('/login');
});

// Login (exemplo simples)
app.get('/login', (req, res) => {
  res.render('login', { title: 'Login', active: 'login' });
});

// Rota base
app.get('/', (req, res) => {
  res.redirect('/deck');
});

// === SERVIDOR ===
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🔥 TigerFy rodando na porta ${PORT}`);
});
