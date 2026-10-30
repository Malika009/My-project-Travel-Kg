# Travel KG

Сайт туров по Кыргызстану: каталог из 32 маршрутов, страница тура с программой и календарём свободных дат, корзина, онлайн-бронирование, личный кабинет и админ-панель. Три языка (кыргызский, русский, английский), светлая и тёмная тема, мобильная версия.

Стек: React 19 + Vite 8 (frontend), Express 5 (API), MongoDB или JSON-файл для хранения данных.

## Локальный запуск

Нужен Node.js 20.19+.

```powershell
cd my
npm install
npm run dev            # сайт: http://localhost:5173
```

В отдельном терминале:

```powershell
cd my/server
npm install
Copy-Item .env.example .env
npm run dev            # API: http://localhost:4000/api
```

Vite перенаправляет `/api` на `http://localhost:4000`. Если API запущен на другом порту: `$env:API_PROXY="http://localhost:4100"; npm run dev`.

Первый администратор: зарегистрируйтесь с email из `ADMIN_EMAIL` в `server/.env`.

## Публикация

- **Frontend** (`travelkg.uk`, Cloudflare Pages): корневая папка `my`, команда сборки `npm run build`, папка результата `dist`. Переменная `VITE_API_URL` — адрес API, например `https://my-project-travel-kg.onrender.com/api`. Если она не задана, production-сборка сама использует этот адрес.
- **Backend** (Render, файл `render.yaml` в корне репозитория): папка `my/server`, `npm ci` → `npm start`, проверка `/api/health`.
  Переменные: `CLIENT_URL=https://travelkg.uk`, `JWT_SECRET` (длинная случайная строка), `ADMIN_EMAIL`, `MONGODB_URI`.
  Для загрузки фото из админки: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` (только на backend).
  Для писем о бронировании: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`.

Без `MONGODB_URI` данные хранятся в `server/data/store.json` — на бесплатном хостинге этот файл стирается при перезапуске, поэтому для публикации нужна MongoDB (например, бесплатный кластер MongoDB Atlas).

При старте сервер один раз добавляет в базу новые туры и исправления (миграции seed v2/v3); удалённые администратором туры не возвращаются.

## Структура

- `src/App.jsx` — маршруты; страницы загружаются по требованию.
- `src/pages/` — главная, каталог, тур, избранное, корзина, оформление, вход, кабинет, админка, авторы фото.
- `src/components/` — шапка, подвал, карточка тура, календарь, просмотр фото, чат-помощник, общие элементы.
- `src/context/AppContext.jsx` — туры, пользователь, избранное, корзина, тема, язык, уведомления.
- `src/data/tourInfo.js` — активности, сезоны, цены и свободные даты (копия правил на сервере: `server/src/booking.js`).
- `src/locales/` — переводы интерфейса (`ru/ky/en.json`) и туров (`tours.*.json`).
- `src/assets/places/` — фотографии мест (Wikimedia Commons, авторы — в `src/data/photoCredits.json` и на странице `/credits`).
- `server/src/index.js` — REST API: туры, аккаунты, бронирования, свободные места, отзывы, сообщения, загрузка фото.
- `server/src/seed.js` — встроенные туры.

Сервер сам пересчитывает цену каждой брони и проверяет дату и число свободных мест — цена из браузера не используется.
