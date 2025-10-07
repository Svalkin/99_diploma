const { client } = require('../../database');
const bcrypt = require('bcryptjs');

const User = {
  async create(username, password) {
    const hash = await bcrypt.hash(password, 10);
    const result = await client.query(
      'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username',
      [username, hash]
    );
    return result.rows[0];
  },

  async findByUsername(username) {
    const result = await client.query(
      'SELECT * FROM users WHERE username = $1',
      [username]
    );
    return result.rows[0];
  }
};

module.exports = User;