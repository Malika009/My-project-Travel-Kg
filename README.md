# Travel KG

Каталог авторских маршрутов по Кыргызстану на React, Vite и Express. Данные загружаются через REST API. Для хранения можно использовать MongoDB; если переменная подключения не задана, backend сохраняет данные в `server/data/store.json`.

## Запуск

Требуется Node.js 20.19+ (Vite 8).

```powershell
cd my
npm install
npm run dev
```

В отдельном терминале:

```powershell
cd my/server
npm install
Copy-Item .env.example .env
npm run dev
```

Frontend работает на `http://localhost:5173`, API — на `http://localhost:4000/api`. Production frontend собирается командой `npm run build` из `my`.

## MongoDB и первый администратор

Чтобы включить MongoDB, укажите `MONGODB_URI` в `server/.env` (например, `mongodb://127.0.0.1:27017/travelkg`) и перезапустите API. Без `MONGODB_URI` используется локальный JSON-файл. Для первого администратора зарегистрируйте адрес, совпадающий с `ADMIN_EMAIL` в `.env` (по умолчанию `admin@travelkg.kg`), затем войдите этим аккаунтом.

Обязательно задайте собственный длинный случайный `JWT_SECRET`. Для отправки подтверждений заказа настройте SMTP-поля из `.env.example`. Внешний платёжный шлюз и Google/GitHub OAuth требуют учётных данных провайдера; в проекте оставлены обычная JWT-регистрация и создание заказа, без фиктивной обработки платежа. Фото маршрутов загружаются с Unsplash.

## Архитектура

- `src/App.jsx` — маршруты, страницы, UI-компоненты и Context для сессии, избранного, корзины и настроек.
- `src/data/services.js` — общий Axios-клиент и JWT заголовок.
- `src/i18n.js`, `src/locales/` — i18next и файлы локализации.
- `src/components/ErrorBoundary.jsx` — граница ошибок React.
- `server/src/index.js` — Express REST API, валидация, JWT роли, email через SMTP, MongoDB/JSON storage.

API включает места, пользователей, заказы и отзывы. Интерфейс поддерживает каталог с поиском и фильтрами, избранное, корзину, бронирование, кабинет, панель администратора, график заказов, модерацию пользователей/отзывов, светлую/тёмную тему и три языка.
