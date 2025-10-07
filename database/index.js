const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const client = new Client({
  connectionString: process.env.DATABASE_URL || `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function runMigrations() {
  try {
    await client.connect();
    console.log('✅ Подключено к БД');

    const migrationFiles = fs.readdirSync(path.join(__dirname, 'migrations')).sort();
    for (const file of migrationFiles) {
      const sql = fs.readFileSync(path.join(__dirname, 'migrations', file), 'utf8');
      await client.query(sql);
      console.log(`✅ Миграция применена: ${file}`);
    }

   
 } catch (err) {
  console.error('❌ Ошибка миграции:');
  console.error('   Сообщение:', err.message || '(нет)');
  console.error('   Код:', err.code || '(нет)');
  console.error('   Стек:', err.stack || '(нет)');
  throw err;
}
}

module.exports = { client, runMigrations };
