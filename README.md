## 🚀 Запуск проекта

### Локально

1. Склонируй репозиторий
2. `cp .env-sample .env`
3. Заполни `.env` своими значениями
4. `npm install`
5. `npm run build`
6. `npm start`

### Переменные окружения

| Переменная | Описание |
|-----------|---------|
| `DATABASE_URL` | URL подключения к PostgreSQL |
| `SESSION_SECRET` | Секрет для подписи сессий |
| `NODE_ENV` | `production` или `development` |
