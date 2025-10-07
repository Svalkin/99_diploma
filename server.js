require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const nunjucks = require('nunjucks');

const authRoutes = require('./backend/routes/auth');
const noteRoutes = require('./backend/routes/notes');
const { runMigrations } = require('./database');

const app = express();

// Сессии
app.use(session({
  secret: process.env.SESSION_SECRET || 'secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === 'production' }
}));

// Парсинг
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Статика (важно: до маршрутов!)
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'frontend-src', 'build')));

// Nunjucks
nunjucks.configure('views', {
  express: app,
  autoescape: true
});

// Маршруты
app.use('/auth', authRoutes);
app.use('/notes', noteRoutes);

// Главная страница
app.get('/', (req, res) => {
  if (req.session.userId) return res.redirect('/dashboard');
  res.render('index.njk', { authError: req.query.error || null });
});

app.get('/dashboard', (req, res) => {
  if (!req.session.userId) return res.redirect('/');
  res.render('dashboard.njk');
});

// Выход
app.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error('Ошибка выхода:', err);
      return res.redirect('/?error=logout_failed');
    }
    res.redirect('/');
  });
});
//app.post('/logout', (req, res) => {
//  req.session.destroy(() => res.redirect('/'));
//});

// 404
app.use((req, res) => {
  res.status(404).send('Страница не найдена');
});

// Запуск миграций
(async () => {
  await runMigrations().catch(err => {
    console.error('❌ Ошибка миграции:', err.message);
    process.exit(1);
  });
})();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Сервер запущен на http://localhost:${PORT}`);
});