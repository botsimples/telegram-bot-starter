// ===============================
// 🔥 TIGERFY SERVER (versão estável .js — com rota /register)
// ===============================

const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const session = require('express-session');
const dotenv = require('dotenv');
const path = require('path');
const expressLayouts = require('express-ejs-layouts');

dotenv.config();
const app = express();

// ===============================
// ⚙️ CONFIGURAÇÕES GERAIS
// ===============================
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

// ===============================
// 💾 CONEXÃO MONGODB
// ===============================
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB conectado!'))
  .catch((err) => console.error('❌ Erro ao conectar MongoDB:', err));

// ===============================
// 🌐 ROTAS PRINCIPAIS
// ===============================

// Página inicial
app.get('/', (req, res) => {
  res.redirect('/login');
});

// Login
app.get('/login', (req, res) => {
  res.render('login', { title: 'Login', active: '' });
});

// Register (cadastro)
app.get('/register', (req, res) => {
  res.render('register', { title: 'Registro', active: '' });
});

// Rota POST para cadastro (placeholder — ainda sem DB)
app.post('/register', (req, res) => {
  const { username, email, password } = req.body;
  console.log('🆕 Novo cadastro recebido:', { username, email, password });
  // Aqui futuramente vai inserir no MongoDB
  // Por enquanto redireciona para login
  res.redirect('/login');
});

// Dashboard (Deck)
app.get('/deck', (req, res) => {
  res.render('deck', { title: 'Dashboard', active: 'deck' });
});

// Ofertas (arquivo bots.ejs)
app.get('/bots', (req, res) => {
  res.render('bots', { title: 'Ofertas', active: 'bots' });
});

// Adquirentes (arquivo api_pix.ejs)
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

// Logout
app.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

// ===============================
// 🚀 INICIAR SERVIDOR
// ===============================
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor online na porta ${PORT}`);
  console.log('✅ TigerFy pronto!');
});
