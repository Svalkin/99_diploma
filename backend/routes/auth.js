// backend/routes/auth.js
const express = require('express');
const User = require('../models/user');
const router = express.Router();

// Регистрация
router.post('/signup', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.create(username, password);
    req.session.userId = user.id;
    res.redirect('/dashboard');
  } catch (err) {
    res.render('index.njk', { authError: 'Пользователь уже существует' });
  }
});

// Вход
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findByUsername(username);
  if (user && await require('bcryptjs').compare(password, user.password_hash)) {
    req.session.userId = user.id;
    res.redirect('/dashboard');
  } else {
    res.render('index.njk', { authError: 'Неверный логин или пароль' });
  }
});

// Выход
router.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

module.exports = router;