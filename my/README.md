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

Обязательно задайте собственный длинный случайный `JWT_SECRET`. Для отправки подтверждений заказа настройте SMTP-поля из `.env.example`. Внешний платёжный шлюз и Google/GitHub OAuth требуют учётных данных провайдера; в проекте оставлены обычная JWT-регистрация и создание заказа, без фиктивной обработки платежа. Исходные фотографии маршрутов находятся в `public/tours`; администратор может указать URL или загрузить JPEG/PNG/WebP до 5 МБ.

## Production deployment

`travelkg.uk` публикуется как статический frontend, поэтому GitHub Pages/Cloudflare Pages не запускает Express API. Backend нужно развернуть отдельно и задать в настройках сборки frontend переменную `VITE_API_URL` с полным адресом API, например `https://<your-api-host>/api`. Не задавайте там `localhost`: в браузере посетителя он указывает на его собственный компьютер. Пересоберите и redeploy frontend после изменения этой переменной.

На backend задайте `CLIENT_URL=https://travelkg.uk`, `JWT_SECRET`, `MONGODB_URI` и `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`. Создайте Cloudinary account и возьмите три значения Cloudinary в Dashboard → Settings → API Keys. Секрет Cloudinary храните только в backend environment variables, не добавляйте в frontend и Git. Для персистентных туров используйте MongoDB; файловое хранилище `server/data/store.json` подходит только для локального запуска и может очищаться при перезапуске хостинга.

Загрузка файла доступна в панели администратора и проходит через JWT-защищённый `POST /api/admin/upload`. Backend передаёт файл в Cloudinary и возвращает постоянный HTTPS URL, который сохраняется вместе с туром в MongoDB. После настройки проверьте `https://<your-api-host>/api/health`, затем откройте каталог на `https://travelkg.uk` и перезагрузите страницу: URL фото должен оставаться в записи тура.

## Архитектура

- `src/App.jsx` — маршруты, страницы, UI-компоненты и Context для сессии, избранного, корзины и настроек.
- `src/data/services.js` — общий Axios-клиент и JWT заголовок.
- `src/i18n.js`, `src/locales/` — i18next и файлы локализации.
- `src/components/ErrorBoundary.jsx` — граница ошибок React.
- `server/src/index.js` — Express REST API, валидация, JWT роли, email через SMTP, MongoDB/JSON storage.

API включает места, пользователей, заказы и отзывы. Интерфейс поддерживает каталог с поиском и фильтрами, избранное, корзину, бронирование, кабинет, панель администратора, график заказов, модерацию пользователей/отзывов, светлую/тёмную тему и три языка.
