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
  res.render('login');
});

// Dashboard principal
app.get('/deck', (req, res) => {
  res.render('deck', { title: 'Dashboard' });
});

// Ofertas
app.get('/ofertas', (req, res) => {
  res.render('ofertas', { title: 'Ofertas' });
});

// Adquirentes
app.get('/adquirentes', (req, res) => {
  res.render('adquirentes', { title: 'Adquirentes' });
});

// Conquistas
app.get('/conquistas', (req, res) => {
  res.render('conquistas', { title: 'Conquistas' });
});

// Perfil
app.get('/perfil', (req, res) => {
  res.render('perfil', { title: 'Meu Perfil' });
});

// ==========================
// 🚀 SERVIDOR ONLINE
// ==========================
const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log('🚀 Servidor online na porta ' + PORT);
  console.log('✅ TigerFy pronto!');
});
