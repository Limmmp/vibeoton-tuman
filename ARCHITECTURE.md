# Предлагаемая архитектура «Тумана Владивостока»

Статус: предложение для постепенной миграции, без изменения исходников. Основание — просмотр `../reference-expo-app/` и текущего проекта, 14 ноября 2026 года.

## Что действительно есть в эталоне

| Область | Наблюдаемая организация |
| --- | --- |
| Навигация | `src/app/_layout.tsx`, `index.tsx`, `explore.tsx`; вход через `expo-router/entry`. Правило `AGENTS.md`: в `src/app/` только маршруты и layout |
| Компоненты | `src/components/` и `components/ui/`; тематические `ThemedText`/`ThemedView`, отдельные вкладки, ссылки и анимации |
| Хуки | `src/hooks/use-theme.ts`, `use-color-scheme.ts` и его `.web.ts`-вариант |
| Стили | Токены в `src/constants/theme.ts`; `StyleSheet.create` рядом с компонентом; `global.css` и CSS module для веба |
| Типы | Props рядом с компонентом, `ThemeColor` рядом с токенами; применяются также типы библиотек |
| Платформы | Парные `app-tabs.tsx`/`.web.tsx`, `animated-icon.tsx`/`.web.tsx`; ассеты отдельно в `assets/` |
| Импорты | Алиасы `@/*` и `@/assets/*` в `tsconfig.json`; экраны используют компоненты, компоненты — хуки и тему |
| Отсутствующие части | Нет `features/`, API/service-слоя, собственного домена, тестовых файлов и настройки тестового runner. В `package.json` есть `expo lint`, но отдельная ESLint-конфигурация и правила границ слоёв в просмотренном дереве не обнаружены |

Следовательно, feature-структура и запреты ниже — **предложение для нашего приложения**, а не якобы готовая архитектура эталона. Его `AGENTS.md` относится к эталонному проекту, не переводит автоматически текущий проект на Expo Router.

## 1. Предлагаемая структура папок

Сохраняем три среды: мобильный клиент, браузерный движок карты и Node.js-инструменты. Не объединяем их в одну Expo-папку.

```text
vibeoton-tuman/
├── mobile/
│   ├── index.ts                     # существующая регистрация приложения
│   ├── App.tsx                      # тонкий вход, временная совместимость
│   ├── src/
│   │   ├── application/
│   │   │   ├── AppRoot.tsx           # сборка приложения и провайдеров
│   │   │   ├── providers/
│   │   │   ├── hooks/                # useMapSession, usePreferences: общая координация
│   │   │   ├── navigation/           # текущий reducer, типы маршрутов, useNavigation
│   │   │   └── shell/                # постоянная карта, HUD, вкладки, модальные окна
│   │   ├── features/
│   │   │   ├── map/
│   │   │   ├── quests/
│   │   │   ├── groups/
│   │   │   ├── places/
│   │   │   ├── rewards/
│   │   │   ├── profile/
│   │   │   ├── settings/
│   │   │   ├── onboarding/
│   │   │   └── developer/
│   │   │       # внутри каждой по необходимости: ui/, hooks/, model/, index.ts
│   │   ├── services/                # map-bridge/, lan/, location/, storage/, weather/
│   │   └── shared/                  # ui/, hooks/, theme/, lib/
│   └── tests/                       # интеграция моста, навигации и сценариев клиента
├── src/
│   ├── contracts/                   # публичный WebView/LAN-протокол, DTO, схемы
│   ├── domain/                      # чистый TS: geo/, places/, quests/, progress/, match/, social/
│   ├── data/                        # адаптеры статических данных; не копия корневого data/
│   ├── engine/                      # браузер: MapLibre, canvas, WebGL, localStorage
│   ├── models/                      # браузерная загрузка и размещение 3D
│   ├── collection/                  # веб-страница коллекции и её CSS
│   ├── dev/                         # браузерные инструменты разработки
│   └── main.ts                      # вход карты
├── scripts/                         # Node.js, сборка данных, LAN middleware, проверки
├── data/                            # JSON, raw, manual/overrides.json
├── public/                          # аватар, GIF, GLB, manifest: URL сохраняются
├── index.html
├── collection.html
└── docs/
```

Пустые папки заранее не создаём. `application/` выбрано намеренно: сейчас используется собственная навигация, а не Router. Возможный будущий `mobile/src/app/` должен содержать только тонкие Expo Router-маршруты, как в эталоне; это отдельная миграция со сменой entry/config, не часть обычного перемещения компонентов.

`src/domain/` и `src/contracts/` — целевое размещение. Существующие `src/quests/`, `src/progress/`, `src/match/`, `src/social/`, `src/data/place.ts` сначала остаются рабочими. Массовый перенос не требуется для начала рефакторинга клиента.

## 2. Правила размещения

| Что | Где и по какому правилу |
| --- | --- |
| Универсальные элементы | `mobile/src/shared/ui/`: Button, Field, Card, Bar, Glyph. Получают props, не знают о группе, GPS или текущем задании |
| UI одной функции | `features/<name>/ui/`: QuestList, ActiveQuestNotice, MeetingPreferencesForm. Локальные props остаются рядом с компонентом |
| Сборка нескольких функций | `application/shell/`: размещение карты, квестовой плашки и навигации. Разные features связываются здесь через callbacks/контракты |
| Хук функции | `features/<name>/hooks/`: состояние и сценарий конкретной функции. Например, `useLan` — в `groups/hooks/`, отдельно от JSX |
| Общий хук | `shared/hooks/` только для независимого UI-поведения, например темы. GPS и сетевой сеанс не становятся shared только потому, что нужны двум экранам |
| Координирующий хук | `application/hooks/`: связывает жизненный цикл карты, подписку GPS, события квеста и переходы. Удаляет эту ответственность из `App.tsx` |
| API и платформенные эффекты | `services/`: fetch, AbortController, WebView-транспорт, Expo Location, AsyncStorage. UI вызывает хук, хук — сервис; сервис возвращает данные/ошибку, не рисует и не навигирует |
| API-типы | Публичные DTO и runtime-схемы — `src/contracts/`; доменные сущности — `src/domain/<name>/types.ts`. UI-специфичный `LanState` — `features/groups/model/`, не `ReturnType` из файла с экраном |
| Бизнес-логика | `src/domain/`: бюджет, общие временные окна, подбор мест, начисление XP и runner заданий. Никаких React, DOM, fetch или Node API |
| Утилиты | Сначала рядом с потребителем. Общая чистая геометрия — `domain/geo/`; форматирование времени встречи — `groups/model/`; действительно универсальное мобильное форматирование — `shared/lib/` |
| Стили | Токены цветов, отступов и шрифтов — `shared/theme/`. Стили компонента рядом с ним; отдельный `*.styles.ts` только при необходимости. CSS карты и коллекции остаётся в веб-части |
| Тесты | Чистые unit-тесты рядом с модулем: `*.test.ts`. Интеграционные мобильные тесты — `mobile/tests/*.test.mjs`. Браузерные проверки — существующие скрипты в `scripts/` |

Публичный `index.ts` feature экспортирует только предназначенные другим слоям компоненты и типы. Внутри feature используем прямые относительные импорты, чтобы общий barrel не создавал циклы. `.web.ts(x)` сохраняется вместе с нативным одноимённым модулем.

Не переносим React-тесты под текущий Node glob без настройки среды: `node:test` не предоставляет renderer React Native. Jest и компонентные тесты — возможное отдельное решение, в эталоне их нет. Алиас `@/` также сначала настраивается и проверяется во всех нужных резолверах; текущие относительные импорты допустимы во время миграции.

## 3. Зависимости и запреты

Разрешённое направление: **application → features → services / shared / contracts / domain**. Дополнительно: **services → contracts / domain**, **contracts → domain (типы)**, **engine / models / scripts → contracts / domain**. `shared/ui` может использовать `shared/hooks` и `shared/theme`; тема не импортирует UI. Сам `domain` зависит только от других чистых доменных модулей и разрешённых чистых библиотек.

Запрещены:

1. Импорты `application` или feature из `shared`, сервисов, контрактов и домена.
2. Прямые импорты соседней feature: `groups/ui → map/ui`, `quests/hooks → profile/model`. Связь через composition/callback или общий контракт.
3. Импорт JSX из API-сервиса, вызов навигации из транспорта, fetch/AsyncStorage внутри презентационного компонента.
4. Импорт `node:fs`, Vite middleware или `scripts/` из мобильного production-кода и веб-runtime. Исключение — изолированный Node-интеграционный тест, который запускает middleware.
5. Импорт React Native/Expo в браузерный движок; импорт runtime MapLibre/Three.js, `window`, DOM или `localStorage` в общий домен и мобильные сервисы.
6. Прямые импорты мобильного клиента из `src/engine/` после выделения контрактов. Сейчас это миграционный долг: `protocol.ts`, `geo.ts` и типы действительно используются клиентом.
7. Обратная зависимость `domain → contracts`, runtime-реэкспорты движка из контрактов и любые циклы, включая циклы, скрытые общими `index.ts`.
8. Дублирование DTO, типов наград и схем между телефоном, картой и LAN-сервером. TypeScript-тип не заменяет проверку входного JSON во время исполнения.

Это целевые ограничения, а не уже настроенный lint. После стабилизации путей их можно закрепить ESLint-ограничениями импортов и отдельной проверкой циклов в CI. Переименование папок само по себе ограничений не создаёт.

## 4. План миграции небольшими шагами

Каждый шаг — отдельный проверяемый коммит без одновременной смены поведения, зависимостей и хранилищ. Сначала зафиксировать исходные результаты проверок и сохранить существующие пользовательские изменения.

| Шаг | Перемещения/выделения | Критерий завершения |
| --- | --- | --- |
| 1 | Выделить токены из `mobile/src/ui.tsx` в `shared/theme/`; Button/Card/Field/Bar и Glyph — в `shared/ui/`. Сохранить временные реэкспорты по старым путям | Внешний вид и доступность прежние; ни один потребитель не потерян |
| 2 | Перенести `ProfilePanel`, `Onboarding`, `DistrictPanel`, `StylePreview`, `DemoPanel` в соответствующие feature UI. По 1–2 панели за коммит | Все существующие переходы работают; логика карты не меняется |
| 3 | Разделить `QuestPanel.tsx` на список, активный шаг, плашку и специализированные элементы. Перенести `PlacesPanel` и `CollectionPanel` по features | Запуск задания, плашка, аудио и fullscreen-награды сохраняют поведение |
| 4 | Разделить `LanPanel.tsx`: `useLan` — в groups/hooks, HTTP-обмен — в services/lan, UI — в groups/ui. Вынести явные типы состояния из зависимости `LanMeetingPanel → typeof useLan → LanPanel` | Два клиента видят одинаковый план; бюджет/время и маршрут не ломаются |
| 5 | Вынести чтение/запись настроек из `preferences.ts` в services/storage, React-хук — в application/hooks. Затем выделить GPS и weather transport | Не изменились ключи, разрешения, обработка ошибок и остановка подписок |
| 6 | Разгрузить `mobile/App.tsx`: AppRoot, провайдеры, shell и useMapSession. Сохранить один стабильный экземпляр WebView и MapBridge вне сменяемых экранов | Переключение вкладок не перезагружает карту и не дублирует обработчики |
| 7 | Выделить чистый geo и доменные типы; затем переносить по одному `match`, `social`, `quests`, `progress`. Последовательно выделить протокол в contracts | Веб, Node и мобильный клиент используют один контракт; нет platform API в domain |
| 8 | Удалить временные реэкспорты после поиска старых путей. Включить проверку границ и мобильные checks в CI | Старые пути не используются ни в коде, ни в тестах/скриптах |

Веб-движок, LAN-протокол, оптимизации и ассеты не переписываются вместе с этими шагами. Expo Router рассматривается отдельно после шага 6: при его внедрении потребуется сохранить постоянную карту в общем layout/provider, проверить Android Back, модальные окна и полноэкранные «Награды».

Проверки для соответствующего изменения: `npm run typecheck`, `npm test`, `npm run build` в корне; `npm run typecheck` и `npm test` в `mobile/`. Для затронутого мобильного UI — существующая Android export-проверка и ручной smoke-test. При переносе данных — ещё `npm run data:check`. При переносе браузерных частей — проверки карты/коллекции существующими browser-скриптами. Не запускать генераторы данных или `reset-project` ради архитектурного анализа.

Ручной минимум: карта не пересоздаётся; GPS не подписывается дважды; старт задания подтверждается; XP обновляется; награды открываются без HUD карты и вспышки HTML; группа синхронизируется; маршрут строится и удаляется по прибытии. Результаты фиксировать для каждого затронутого сценария.

## 5. Риски и чувствительные к переносу файлы

Любое перемещение требует проверки входящих **и** исходящих импортов. Следующие файлы также зависят от конфигурации, URL, тестовых glob или жизненного цикла:

| Файлы/группа | Что обязательно обновлять или сохранять |
| --- | --- |
| `mobile/index.ts`, `mobile/App.tsx` | `main` в `mobile/package.json`, import App, регистрацию приложения; при Router также entry и plugins в `app.json` |
| `mobile/src/ui.tsx`, `motion.tsx`, `glyphs.tsx` | Многочисленных потребителей и взаимные импорты. Сначала отделить тему; не создавать цикл UI ↔ motion |
| `mobile/src/LanPanel.tsx`, `LanMeetingPanel.tsx` | `App.tsx`, тип состояния хука, сетевой цикл, cleanup и единственность активной LAN-подписки |
| `mobile/src/bridge.ts`, `src/engine/protocol.ts` | `MapSurface`, обработчики App, `mobile/tests/bridge.test.mjs`, связанные типы quests/progress/performance/players; переносить контракт согласованно |
| `src/engine/geo.ts`, `src/data/place.ts`, `src/match/`, `src/social/` | Импорты в mobile, engine, scripts и Node-тестах; `.ts`-расширения, необходимые существующему запуску тестов |
| `mobile/src/catalog.ts`, `src/models/catalog.ts`, `src/engine/player.ts` | Относительные пути к `data/places.json`, manifest, `public/avatar/config.json`; разделить загрузчик данных и чистые функции |
| `scripts/lan-plugin.ts` | Импорт в `vite.config.ts`, путь `new URL('../data/places.json', import.meta.url)`, Node-тесты LAN и meetings |
| `src/main.ts`, `src/collection/page.ts`, `src/collection/style.css` | `index.html`, `collection.html`, CSS-link в head, динамические импорты viewer и entrypoints `vite.config.ts` |
| `public/avatar/`, `public/models/landmarks/` | Публичные URL, config, manifest, загрузчик, контрольные сценарии. Аватар, GIF и GLB в этой миграции оставить на месте |
| `src/engine/storage.ts`, `src/progress/storage.ts`, `src/quests/storage.ts`, `mobile/src/preferences.ts`, `CompanyPanel.tsx` | Префикс `tuman:`, ключи progress/quest-active/preferences/companyDraft и семантику сохранений. Перемещение файла не повод менять ключи или origin карты |
| `mobile/tests/*.test.mjs`, `src/**/*.test.ts` | Прямые импорты, fixture URL и scripts.test обоих package.json. Текущий корневой glob не запускает произвольные мобильные `.test.ts` |
| `scripts/check-render.mjs`, `scripts/check-demo-collection.mjs` | Файловые пути, URL страниц и ожидаемый DOM, если перенос затрагивает веб-часть |
| `mobile/tsconfig.json`, корневой `tsconfig.json`, оба package.json, workflows | Границы компиляции, Node/Metro/Vite resolution и команды CI. Алиас эталона не распространяется на них автоматически |

Основные риски: потеря локального прогресса при смене origin/ключей; пересоздание WebView при смене маршрута; утечка Node или WebGL-зависимостей в мобильный bundle; несогласованный WebView-протокол; потеря тестов из-за glob; изменение выбора `.web`-варианта; разрыв JSON/asset URL; скрытые циклы через barrels. `CompanyPanel.tsx`, `places.ts` и `icons.tsx` не удалять как «старые» без отдельной проверки потребителей и тестов.

В рамках этого анализа существующие файлы и эталон не изменяются. Создаётся только данный документ; предложенные перемещения и новые правила ещё не применены.
