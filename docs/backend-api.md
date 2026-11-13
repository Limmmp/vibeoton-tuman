# Бэкенд «Тумана»: API

Сервер — `server/` (Node 24 + TypeScript без сборки, Hono, встроенный SQLite). Тот же алгоритм подбора мест, что в приложении (`src/match/matchGroup.ts`).

- Рабочий адрес: `https://176-53-248-123.sslip.io` (сервер хакатона, Docker + Caddy с автоматическим HTTPS).
- Локально: `cd server && npm install && npm run dev` → `http://localhost:8787` (демо-вход и демо-друзья включены).
- Тесты: `cd server && npm test`.

Все ответы — JSON. Ошибка: `{ "error": "код", "message": "текст для пользователя по-русски" }`. Запросы после входа — с заголовком `Authorization: Bearer <token>`.

## Вход

| Метод | Путь | Тело | Ответ |
| --- | --- | --- | --- |
| GET | `/health` | — | `{ ok, providers: ["email", ...], devLogin, places }` — какие способы входа включены |
| POST | `/auth/email/register` | `{ email, password (≥ 8), name }` | `201 Session`, `409 email_taken` |
| POST | `/auth/email/login` | `{ email, password }` | `Session`, `401 bad_credentials` |
| POST | `/auth/vk` | `{ token }` — access token VK ID | `Session` (201 — новый аккаунт) |
| POST | `/auth/yandex` | `{ token }` — OAuth-токен Яндекс ID, выданный приложению `YANDEX_CLIENT_ID` | `Session` |
| POST | `/auth/google` | `{ idToken }` | `Session` |
| POST | `/auth/telegram` | данные виджета Telegram Login как есть (`id, first_name, …, auth_date, hash`) | `Session` |
| POST | `/auth/dev` | `{ name }` — только при `DEV_LOGIN=1`, для защиты | `201 Session`, сразу в друзьях Петя, Маша, Аня (`SEED_DEMO=1`) |
| POST | `/auth/logout` | — | `{ ok }` |

`Session = { token, expiresAt, user: Me }`. Сессия живёт 90 дней. Соцсеть без настроенного ключа отвечает `503 provider_not_configured` — кнопку в приложении стоит прятать по `/health`. Аккаунты по совпадению почты не склеиваются (почта при регистрации не подтверждается) — вход через соцсеть даёт свой аккаунт.

## Профиль

| Метод | Путь | Тело |
| --- | --- | --- |
| GET | `/me` | — |
| PATCH | `/me` | любое из `{ name, handle (латиница, цифры, _), avatar: { glyph, color }, interests: Interest[] }` |

`Me = { id, name, handle, avatar, email, friendCode, interests, providers }`. `User` (другие люди) = `{ id, name, handle, avatar }`.

Аватар — значок и цвет из набора: значки `lighthouse gull anchor wave hill cat tiger star bridge compass`, цвета `#F5B83D #4CC2B5 #FF7A6B #7C9CFF #5BC07A #C58BF2 #F2A65A #9AA8B3`. Чужие значения заменяются набором по умолчанию.

## Друзья

| Метод | Путь | Тело / ответ |
| --- | --- | --- |
| GET | `/friends` | `{ friends: User[], incoming: User[], outgoing: User[] }` |
| GET | `/users/search?q=` | по началу ника или точному коду друга → `{ users: User[] }` |
| POST | `/friends/requests` | `{ code }` или `{ handle }` или `{ userId }` → `{ status: "pending" \| "accepted" }`. Встречная заявка сразу принимает дружбу |
| POST | `/friends/requests/:userId/accept` \| `decline` | — |
| DELETE | `/friends/:userId` | — |

Код друга — 6 символов без похожих (`0/O`, `1/I`), его удобно продиктовать или показать QR-кодом.

## Пачки — постоянные компании

| Метод | Путь | Тело |
| --- | --- | --- |
| GET | `/parties` | → `{ parties: Party[] }` |
| POST | `/parties` | `{ name, memberIds }` — только друзья создателя |
| POST | `/parties/:id/members` | `{ userIds }` |
| DELETE | `/parties/:id/members/:userId` | себя — выйти; других — только создатель |

`Party = { id, name, ownerId, members: User[] }`.

## Встречи

| Метод | Путь | Тело |
| --- | --- | --- |
| GET | `/meetings` | → `{ meetings: Meeting[] }` (кроме отменённых) |
| POST | `/meetings` | `{ title, startsAt, endsAt, budgetMode, fixedBudget?, myBudget?, indoorOnly?, partyId? \| memberIds? }` |
| GET | `/meetings/:id` | — |
| PATCH | `/meetings/:id` | создатель: `{ title, startsAt, endsAt, budgetMode, fixedBudget, indoorOnly, status: "cancelled" }` |
| POST | `/meetings/:id/rsvp` | участник о себе: `{ rsvp: "going" \| "declined", budget, interests, noClimb, mood: "calm" \| "active" }` |
| POST | `/meetings/:id/suggest` | `{ weatherBad? }` → `{ budget, window, hints, results: [{ place, price, reason, flags, travel, score }] }` |
| POST | `/meetings/:id/votes` | `{ placeId, value: 1 \| -1 \| 0 }` (0 — снять голос) |
| POST | `/meetings/:id/choose` | создатель: `{ placeId }` → статус `chosen` |

### Режимы бюджета (`budgetMode`)

| Режим | Смысл | Лимит цены на человека |
| --- | --- | --- |
| `individual` | каждый платит за себя | самый скромный бюджет в компании |
| `pooled` | скидываемся в общий котёл, кто может больше — покрывает остальных | сумма бюджетов ÷ число участников |
| `fixed` | организатор назначает сумму, она нужна каждому | `fixedBudget`; у кого меньше — `budget.shortfall` и `enough: false` |

`Meeting = { id, title, ownerId, partyId, startsAt, endsAt, budgetMode, fixedBudget, indoorOnly, status, place, budget: { perPerson, total, label, shortfall }, members: [{ user, rsvp, interests, noClimb, mood, budget?, enough }], votes: { [placeId]: { score, count } }, myVotes }`.

Конкретную сумму участника видит только он сам (`budget` у остальных не приходит), остальным — достаточно ли её (`enough`). Отказавшиеся (`declined`) не учитываются в бюджете и подборе.

## Настройки сервера

`deploy/.env` (пример — `deploy/.env.example`): `DOMAIN`, `DEV_LOGIN`, `SEED_DEMO`, `VK_CLIENT_ID`, `TELEGRAM_BOT_TOKEN`, `GOOGLE_CLIENT_IDS`, `YANDEX_CLIENT_ID`. Секреты в репозиторий не коммитить. Данные — Docker-том `tuman-data` (`/data/tuman.sqlite`).

Обновить сервер после пуша:

```bash
ssh tech@176.53.248.123
cd /opt/tuman && git pull && sudo docker compose -f deploy/docker-compose.yml --env-file deploy/.env up -d --build
```
