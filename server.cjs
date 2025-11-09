// ==========================
// 🔥 TIGERFY SERVER
// ==========================

const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const session = require('express-session');
const dotenv = require('dotenv');
const path = require('path');
const expressLayouts = require('express-ejs-layouts');

dotenv.config();
const app = express();

// ==========================
// ⚙️ CONFIGURAÇÕES
// ==========================
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layout');

app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(
  session({
    secret: 'tigerfy_secret',
    resave: false,
    saveUninitialized: false,
  })
);

// ==========================
// 🧠 CONEXÃO COM MONGO
// ==========================
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB conectado!'))
  .catch((err) => console.error('❌ Erro ao conectar MongoDB:', err));

// ==========================
// 🌐 ROTAS
// ==========================

// Página inicial
app.get('/', (req, res) => {
  res.redirect('/login');
});

// Login
app.get('/login', (req, res) => {
  res.render('login', { title: 'Login', active: '' });
});

// Dashboard principal
app.get('/deck', (req, res) => {
  res.render('deck', { title: 'Dashboard', active: 'deck' });
});

// Ofertas
app.get('/bots', (req, res) => {
  res.render('ofertas', { title: 'Ofertas', active: 'bots' });
});

// Adquirentes
app.get('/api_pix', (req, res) => {
  res.render('adquirentes', { title: 'Adquirentes', active: 'api_pix' });
});

// Conquistas
app.get('/conquistas', (req, res) => {
  res.render('conquistas', { title: 'Conquistas', active: 'conquistas' });
});

// Perfil
app.get('/perfil', (req, res) => {
  res.render('perfil', { title: 'Meu Perfil', active: 'perfil' });
});

// Logout
app.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

// ==========================
// 🚀 SERVIDOR ONLINE
// ==========================
const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log('🚀 Servidor online na porta ' + PORT);
  console.log('✅ TigerFy pronto!');
});
