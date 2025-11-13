// ===============================
// ⚡ TIGERFY SERVER (versão com login)
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

const Admin = require('./models/admin');
const Offer = require('./models/Offer');

dotenv.config();
const app = express();

// ===============================
// ⚙️ CONFIG GERAL
// ===============================
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layout');

app.use(compression());
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(morgan('tiny'));

app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '30d',
  etag: true
}));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(session({
  secret: 'tigerfy_secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 2,
    sameSite: 'strict'
  }
}));

// middleware pra ter user disponível nas views, se quiser
app.use((req, res, next) => {
  res.locals.currentUserId = req.session.userId || null;
  next();
});

// ===============================
// 🛡️ Middleware de auth
// ===============================
function ensureAuth(req, res, next) {
  if (req.session && req.session.userId) return next();
  return res.redirect('/login');
}

// ===============================
// 💾 MONGO
// ===============================
mongoose.set('strictQuery', false);

mongoose.connect(process.env.MONGO_URI, {
  serverSelectionTimeoutMS: 10000,
})
  .then(() => console.log('✅ MongoDB conectado!'))
  .catch((err) => console.error('❌ Erro MongoDB:', err.message));

// ===============================
// 🌐 ROTAS DE AUTH
// ===============================
app.get('/', (req, res) => {
  if (req.session.userId) return res.redirect('/deck');
  return res.redirect('/login');
});

app.get('/login', (req, res) => {
  if (req.session.userId) return res.redirect('/deck');
  res.render('login', { title: 'Login', active: '', layout: false, error: null });
});

app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await Admin.findOne({ email });
    if (!user) {
      return res.render('login', {
        title: 'Login',
        active: '',
        layout: false,
        error: 'E-mail ou senha inválidos.'
      });
    }

    const ok = await user.comparePassword(password);
    if (!ok) {
      return res.render('login', {
        title: 'Login',
        active: '',
        layout: false,
        error: 'E-mail ou senha inválidos.'
      });
    }

    req.session.userId = user._id.toString();
    return res.redirect('/deck');

  } catch (err) {
    console.error(err);
    return res.render('login', {
      title: 'Login',
      active: '',
      layout: false,
      error: 'Erro interno ao tentar logar.'
    });
  }
});

app.get('/register', (req, res) => {
  if (req.session.userId) return res.redirect('/deck');
  res.render('register', { title: 'Registro', active: '', layout: false, error: null });
});

app.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const exists = await Admin.findOne({ email });
    if (exists) {
      return res.render('register', {
        title: 'Registro',
        active: '',
        layout: false,
        error: 'Já existe uma conta com esse e-mail.'
      });
    }

    const user = new Admin({ name, email, password });
    await user.save();

    req.session.userId = user._id.toString();
    return res.redirect('/deck');

  } catch (err) {
    console.error(err);
    return res.render('register', {
      title: 'Registro',
      active: '',
      layout: false,
      error: 'Erro ao criar conta.'
    });
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

// ===============================
// 📊 ROTAS INTERNAS (protegidAS)
// ===============================
app.get('/deck', ensureAuth, (_, res) =>
  res.render('deck', { title: 'Dashboard', active: 'deck' })
);

app.get('/bots', ensureAuth, (_, res) =>
  res.render('bots', { title: 'Ofertas', active: 'bots' })
);

app.get('/bots/create', ensureAuth, (_, res) =>
  res.render('bots_create', { title: 'Criar Oferta', active: 'bots' })
);

app.post('/bots/create', ensureAuth, async (req, res) => {
  try {
    const { name, botType, tracking } = req.body;

    await Offer.create({
      name,
      botType,
      tracking,
      owner: req.session.userId
    });

    return res.redirect('/bots/manage');
  } catch (err) {
    console.error(err);
    return res.send('Erro ao criar oferta.');
  }
});

app.get('/bots/manage', ensureAuth, async (req, res) => {
  try {
    const offers = await Offer.find({ owner: req.session.userId }).sort({ createdAt: -1 }).lean();
    res.render('bots_manage', {
      title: 'Gerenciar Ofertas',
      active: 'bots',
      offers
    });
  } catch (err) {
    console.error(err);
    res.send('Erro ao carregar ofertas.');
  }
});

app.get('/api_pix', ensureAuth, (_, res) =>
  res.render('api_pix', { title: 'Adquirentes', active: 'api_pix' })
);

app.get('/perfil', ensureAuth, (_, res) =>
  res.render('perfil', { title: 'Meu Perfil', active: 'perfil' })
);

app.get('/conquistas', ensureAuth, (_, res) =>
  res.render('conquistas', { title: 'Conquistas', active: 'conquistas' })
);

// ===============================
// 🚀 START
// ===============================
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 TigerFy rodando em modo otimizado | Porta ${PORT}`);
});
