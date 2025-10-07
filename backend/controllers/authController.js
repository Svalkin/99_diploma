const User = require('../models/user');
const Note = require('../models/note');
const bcrypt = require('bcryptjs');

exports.signup = async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.create(username, password);
    req.session.userId = user.id;

    // C1: Демо-заметка
    await Note.create(user.id, 'Demo', `
# Добро пожаловать в SkillNotes!

Это **демонстрационная заметка**.

- Список
- Элементы

\`\`\`js
console.log("Привет!");
\`\`\`
    `);

    res.redirect('/dashboard');
  } catch (err) {
    res.render('index.njk', { authError: 'Пользователь уже существует' });
  }
};

exports.login = async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findByUsername(username);
  if (user && await bcrypt.compare(password, user.password_hash)) {
    req.session.userId = user.id;
    res.redirect('/dashboard');
  } else {
    res.render('index.njk', { authError: 'Неверный логин или пароль' });
  }
};