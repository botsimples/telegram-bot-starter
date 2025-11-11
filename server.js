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

// Login handler (simples — sem validação ainda)
app.post('/deck', (req, res) => {
  const { user, pass } = req.body;

  // Aqui você pode futuramente validar o usuário com o banco
  console.log(`🧠 Tentativa de login: ${user}`);

  // Por enquanto, sempre redireciona ao deck
  res.redirect('/deck');
});

// Página de Login
app.get('/login', (req, res) => {
  res.render('login', { title: 'Login', active: '', layout: false });
});

// Registro
app.get('/register', (req, res) => {
  res.render('register', { title: 'Registro', active: '', layout: false });
});

// Envio de cadastro (com WhatsApp redirect)
app.post('/register', (req, res) => {
  const { username, email } = req.body;

  console.log('🆕 Novo cadastro pendente:', { username, email });

  res.render('register_success', {
    title: 'Cadastro Enviado',
    layout: false,
    whatsapp: 'https://wa.me/5543999562213?text=Opa%20Gustavo%2C%20fiz%20meu%20cadastro%20na%20TigerFy%20⚡'
  });
});

// Dashboard (Deck)
app.get('/deck', (req, res) => {
  res.render('deck', { title: 'Dashboard', active: 'deck' });
});

// Ofertas
app.get('/bots', (req, res) => {
  res.render('bots', { title: 'Ofertas', active: 'bots' });
});

// Adquirentes
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
