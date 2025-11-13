// ===============================
// ⚡ TIGERFY SERVER (versão otimizada)
// ===============================

const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const session = require('express-session');
const dotenv = require('dotenv');
const path = require('path');
const compression = require('compression');
const helmet = require('helmet');
const morgan = require('morgan');
const expressLayouts = require('express-ejs-layouts');

// MODELS
const Offer = require('./models/Offer');

dotenv.config();
const app = express();

// ===============================
// ⚙️ CONFIGURAÇÕES GERAIS
// ===============================
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layout');

// Segurança e otimização
app.use(compression());
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));
app.use(morgan('tiny'));

// Static cache
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '30d',
  etag: true
}));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Sessão
app.use(session({
  secret: 'tigerfy_secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 2, 
    sameSite: 'strict'
  }
}));

// ===============================
// 🛡️ Middleware de autenticação
// ===============================
function ensureAuth(req, res, next) {
  if (req.session && req.session.userId) return next();
  return res.redirect('/login');
}

// ===============================
// 💾 MONGODB
// ===============================
mongoose.set('strictQuery', false);
mongoose.connect(process.env.MONGO_URI, {
  serverSelectionTimeoutMS: 10000,
})
  .then(() => console.log('✅ MongoDB conectado!'))
  .catch((err) => console.error('❌ Erro MongoDB:', err.message));


// ===============================
// 🌐 ROTAS PRINCIPAIS (Login/Views)
// ===============================
app.get('/', (_, res) => res.redirect('/login'));

app.get('/login', (_, res) => res.render('login', { title: 'Login', active: '', layout: false }));
app.get('/register', (_, res) => res.render('register', { title: 'Registro', active: '', layout: false }));

app.post('/register', (req, res) => {
  const { username, email } = req.body;
  console.log('🆕 Novo cadastro:', { username, email });
  res.render('register_success', {
    title: 'Cadastro Enviado',
    layout: false,
    whatsapp: 'https://wa.me/5543999562213?text=Opa%20Gustavo%2C%20fiz%20meu%20cadastro%20na%20TigerFy%20⚡'
  });
});

// Fake login apenas para continuar
app.post('/deck', (req, res) => {
  req.session.userId = req.body.user || "123456";
  res.redirect('/deck');
});

app.get('/deck', ensureAuth, (_, res) => res.render('deck', { title: 'Dashboard', active: 'deck' }));
app.get('/perfil', ensureAuth, (_, res) => res.render('perfil', { title: 'Meu Perfil', active: 'perfil' }));
app.get('/conquistas', ensureAuth, (_, res) => res.render('conquistas', { title: 'Conquistas', active: 'conquistas' }));
app.get('/api_pix', ensureAuth, (_, res) => res.render('api_pix', { title: 'Adquirentes', active: 'api_pix' }));

app.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});


// ===============================
// ⚡ ROTAS DE OFERTAS / BOTS
// ===============================

// HUB de ofertas
app.get('/bots', ensureAuth, (_, res) => {
  res.render('bots', { title: 'Ofertas', active: 'bots' });
});

// Criar oferta (view)
app.get('/bots/create', ensureAuth, (_, res) => {
  res.render('bots_create', {
    title: 'Criar Oferta',
    active: 'bots'
  });
});

// Criar oferta (POST)
app.post('/bots/create', ensureAuth, async (req, res) => {
  try {
    const ownerId = req.session.userId;
    const { name, botType, trackingType } = req.body;

    const offer = await Offer.create({
      owner: ownerId,
      name,
      botType,
      trackingType,
      status: 'incompleto'
    });

    res.redirect(`/bots/manage?id=${offer._id}`);
  } catch (err) {
    console.error(err);
    res.send('Erro ao criar oferta.');
  }
});

// Gerenciar oferta (listagem + detalhe)
app.get('/bots/manage', ensureAuth, async (req, res) => {
  try {
    const ownerId = req.session.userId;

    const offers = await Offer.find({ owner: ownerId }).sort({ createdAt: -1 }).lean();
    let selectedOffer = null;

    if (req.query.id) {
      selectedOffer = await Offer.findOne({
        _id: req.query.id,
        owner: ownerId
      }).lean();
    }

    res.render('bots_manage', {
      title: 'Gerenciar Ofertas',
      active: 'bots',
      offers,
      selectedOffer
    });

  } catch (err) {
    console.error(err);
    res.send('Erro ao carregar ofertas.');
  }
});

// Atualizar token do bot
app.post('/bots/:id/token', ensureAuth, async (req, res) => {
  try {
    const ownerId = req.session.userId;
    const offer = await Offer.findOne({ _id: req.params.id, owner: ownerId });

    if (!offer) return res.send('Oferta não encontrada.');

    offer.botToken = req.body.botToken;
    offer.telegramUsername = req.body.telegramUsername || null;
    offer.status = req.body.botToken ? 'ativo' : 'incompleto';

    await offer.save();

    res.redirect(`/bots/manage?id=${offer._id}`);
  } catch (err) {
    console.error(err);
    res.send('Erro ao salvar token.');
  }
});


// ===============================
// 🚀 INICIAR SERVIDOR
// ===============================
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 TigerFy rodando em modo otimizado | Porta ${PORT}`);
});
