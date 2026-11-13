# Движок карты: как подключить в приложение

Карта — отдельная веб-страница на MapLibre GL (папка `src/engine`), которая открывается в приложении через WebView. Приложение (React Native + Expo) рисует весь интерфейс и общается с картой сообщениями. Сама карта интерфейса не рисует.

Почему WebView: в нативном MapLibre нет 3D-рельефа и неба, а без них не будет сопок и тумана на склонах.

## Что умеет

- Тёмная карта Владивостока с подписями на русском.
- Рельеф: отмывка склонов видна везде, даже под туманом. В режиме 3D — рельеф, наклон камеры, дымка у горизонта.
- Туман войны: ячейки 20 м, открывается вокруг игрока (радиус 45 м) и ложится на рельеф. Прогресс хранится в `localStorage` WebView.
- 3D-дома, но только в открытых местах.
- Игрок с тремя режимами:
  - `sim` — клавиатура и клики, для демо;
  - `external` — позицию присылает приложение;
  - `gps` — GPS браузера.
- Пешие маршруты (OSRM) с профилем высот, суммарным подъёмом и спуском и временем с учётом уклона.
- Метки мест, тапы по ним и по карте, долгое нажатие.

## Где лежит

**https://limmmp.github.io/vibeoton-tuman/** — собранный движок. Обновляется сам при каждом пуше в `main` (GitHub Actions, ~1–2 минуты). В обычном браузере там видна отладочная панель, внутри приложения её нет.

## Запуск для разработки

```bash
npm install
npm run dev        # http://localhost:5173 — карта + отладочная панель (только в браузере)
npm run build      # сборка в dist/
```

С телефона в той же сети: `http://<ip-ноутбука>:5173`. Для GPS браузера нужен https, а вот для `external` (GPS из приложения) он не нужен.

## Подключение в React Native

```bash
npx expo install react-native-webview expo-location
```

```tsx
import { useRef } from "react";
import { WebView } from "react-native-webview";
import type { Command, EngineEvent } from "./protocol"; // скопировать src/engine/protocol.ts

const MAP_URL = "https://limmmp.github.io/vibeoton-tuman/"; // или http://<ip-ноутбука>:5173 при локальной разработке движка

export function MapView() {
  const ref = useRef<WebView>(null);
  const send = (cmd: Command) => ref.current?.postMessage(JSON.stringify(cmd));

  const onMessage = (e: { nativeEvent: { data: string } }) => {
    const ev: EngineEvent = JSON.parse(e.nativeEvent.data);
    switch (ev.type) {
      case "ready":
        send({ type: "setPlayerMode", mode: "external" });
        break;
      case "placeTap":
        /* открыть карточку места ev.id */
        break;
      case "mapLongPress":
        send({ id: "r1", type: "route", to: { lat: ev.lat, lon: ev.lon } });
        break;
      case "result":
        /* ответ на команду с id: ev.data — например, { distance, climb, minutes, profile } */
        break;
      case "fogChanged":
        /* обновить «Открыто N км²» */
        break;
    }
  };

  return <WebView ref={ref} source={{ uri: MAP_URL }} onMessage={onMessage} originWhitelist={["*"]} style={{ flex: 1 }} />;
}
```

GPS из приложения (работает и в фоне, если подключить `expo-task-manager`):

```ts
import * as Location from "expo-location";

await Location.requestForegroundPermissionsAsync();
Location.watchPositionAsync(
  { accuracy: Location.Accuracy.High, distanceInterval: 5 },
  (p) => send({ type: "gpsFix", lat: p.coords.latitude, lon: p.coords.longitude, accuracy: p.coords.accuracy ?? undefined, heading: p.coords.heading ?? undefined }),
);
```

## Протокол

Контракт команд и событий — в [`src/engine/protocol.ts`](../src/engine/protocol.ts), типы квестов — в [`src/quests/types.ts`](../src/quests/types.ts), профиль и награды — в [`src/progress/types.ts`](../src/progress/types.ts). В RN-проект нужно копировать эти три файла.

**Команды (приложение → карта).** Если у команды есть `id`, карта отвечает событием `result` с тем же `id`.

| Команда | Что делает | Ответ |
| --- | --- | --- |
| `setRenderQuality { quality: "low" \| "balanced" \| "high" }` | меняет туман, дома и 3D-наклон; pixel ratio меняется после перезапуска WebView | `RenderProfile` |
| `setViewMode { mode: "2d" \| "3d" }` | переключает рельеф и наклон | — |
| `setPlayerMode { mode }` | `sim` / `external` / `gps` | итоговый режим |
| `gpsFix { lat, lon, accuracy?, heading? }` | позиция игрока из приложения | — |
| `teleport { lat, lon }` | переставляет игрока (для демо) | — |
| `walkTo { lat, lon }` | игрок идёт к точке (только `sim`) | — |
| `follow { on }` | камера следует за игроком | — |
| `flyTo { lat, lon, zoom? }` | переносит камеру | — |
| `showPlaces { places: [{ id, lat, lon, name?, kind? }] }` | показывает метки; `kind` задаёт цвет | — |
| `route { to, from? }` | рисует маршрут (от игрока или от `from`) | `{ distance, climb, descent, minutes, profile }` |
| `clearRoute` | убирает маршрут | — |
| `elevation { lat, lon }` | высота точки | `{ h }` |
| `revealAt { lat, lon, radius? }` | открывает туман (для отладки и наград) | число новых ячеек |
| `resetFog` | сбрасывает туман | — |
| `listQuests` | список встроенных квестов без полных шагов | `QuestSummary[]` |
| `startQuestById { questId }` | запускает квест из встроенного каталога | активный шаг |
| `startQuest { quest }` | валидирует и запускает внешний квест | активный шаг |
| `stopQuest` | останавливает активный квест | — |
| `answerQuiz { answer }` | отвечает на `quiz`, индекс 0–2 | `{ correct }` |
| `completeListen` | сообщает, что аудио дослушано | — |
| `confirmLook` | подтверждает выполнение `look` | — |
| `getQuestState` | возвращает активный шаг | `ActiveStep | null` |
| `getProgress` | опыт, уровень, валюта, репутация, инвентарь, экипировка и история квестов | `ProgressState` |
| `setSelfAvatar { appearance }` | меняет заглушку аватара; `modelUrl` зарезервирован для 3D | `AvatarAppearance` |
| `listAvatarItems` | каталог косметических предметов | `AvatarItem[]` |
| `equipAvatarItem { itemId }` | экипирует полученный предмет в его слот | `ProgressState` |
| `unequipAvatarSlot { slot }` | снимает предмет из слота | `ProgressState` |
| `resetProgress` | сбрасывает локальный профиль; только для отладки | `ProgressState` |
| `showPlayers { players }` / `updatePlayers { players }` / `removePlayers { ids }` | другие игроки: `{ id, lat, lon, name?, relation: party \| friend \| public, color? }` | число игроков |
| `setSocialLayer { mode }` | кого показывать: `off`, `party`, `friends`, `all` | — |
| `listShop` | магазин: баннеры гачи с ценами, шансами и счётчиком гарантии, витрина вещей с ценами | объект магазина |
| `gachaPull { bannerId, count: 1 \| 10 }` | крутки набора за монеты | `{ results: [{ itemId, rarity, duplicate, shards }], spent, state }` |
| `buyItem { itemId, currency: cash \| shards }` | купить вещь на витрине | `ProgressState` |
| `setLighting { mode }` | окна и свет домов: `auto` (по времени Владивостока, ночь 18:00–07:00), `day`, `night` — для демо | `{ night }` |
| `setLayers { layers }` | какие категории меток видны: `quests`, `study`, `leisure`, `history`, `events`. По умолчанию видны все | `MapLayer[]` |
| `selectPlace { placeId, fly? }` | кольцо и подпись у метки, перелёт к ней (`fly: false` — без перелёта); `null` — снять выбор | — |
| `getDistricts` | районы: открыто уличных ячеек, всего, процент, последняя веха | `DistrictStat[]` |
| `checkIn { placeId }` | отметиться в месте из `showPlaces`; игрок должен быть ближе 60 м; первая отметка даёт награду и открывает туман вокруг места | `{ ok, distance, first?, reward? }` |
| `getState` | позиция, режимы, туман, квест и профиль | `State` |

**События (карта → приложение):** `ready`, `playerMoved`, `fogChanged`, `mapTap`, `mapLongPress`, `placeTap`, `questTargetTap`, `activeStep`, `stepDone`, `questDone`, `questFailed`, `questStopped`, `progressChanged`, `rewardGranted`, `districtProgress`, `districtMilestone`, `checkedIn`, `clusterTap`, `playerTap`, `inventoryChanged`, `renderQualityChanged`, `result`.

`mapTap.action` равен `walk` только в симуляции. При включённом GPS/`external` тап не двигает аватар и приходит как `select`: приложение может выбрать точку или построить маршрут. После отключения GPS нужно отправить `setPlayerMode { mode: "sim" }`, тогда тапы снова запускают демопрогулку.

Квестовый движок не рисует интерфейс React Native. Приложение получает `activeStep`, показывает текст, аудио и варианты ответа, затем отправляет команду подтверждения. Шаги `goto`, `hold`, `tail`, `collect`, `explore` и `visit` отслеживает движок. Для `listen` и `look` сначала нужен геотриггер у точки; готовность приходит в `activeStep.runtime`.

`activeStep.targets` содержит вычисленные цели текущего шага. Движок сам показывает их янтарными, зелёными или коралловыми метками. `distanceMeters` — расстояние до ближайшей незавершённой цели. `progress` содержит `current`, `total` и единицу измерения. Нажатие по метке даёт `questTargetTap`; приложение решает, строить ли маршрут или открывать подсказку.

Встроенный технический квест `engine-demo-center` лежит в [`src/quests/catalog.ts`](../src/quests/catalog.ts). Он использует реальные координаты мест из OSM, но не содержит исторических утверждений. В браузерной отладочной панели кнопка «Тест-квест» переносит игрока к старту. Нажатие по целевой метке запускает движение в режиме `sim`.

Активный квест сохраняется в `localStorage` WebView и восстанавливается при запуске. Типы квеста экспортируются из [`src/engine/protocol.ts`](../src/engine/protocol.ts); исходная логика лежит в `src/quests/`.

## Прогресс и награды

Встроенный квест может выдать `xp`, `cash`, `rep` и косметические `items`. Награда выдаётся один раз на `questId`. Повторное прохождение возвращает `rewardGranted` с `granted: false` и `reason: "already-completed"`. Внешний `startQuest` проходит механику, но не выдаёт награду: событие содержит `reason: "untrusted-quest"`. Это не позволяет приложению подставить квест с произвольной валютой.

Профиль хранится локально в WebView. `completedQuests` содержит историю завершений и полученные награды. `inventory` хранит количество предметов, `equipped` — выбранный предмет по слоту. Сейчас в каталоге есть тестовая `admiral-cap`, которую выдаёт `engine-demo-center`.

## Другие игроки

Карта только рисует игроков, которых прислало приложение. Кто кого видит, огрубление координат публичных игроков и сеть — на стороне приложения и сервера (диз-док, 8.5).

- **Значки:** кружок фиксированного размера с инициалом. Кольцо: группа — янтарь, друг — бирюза, публичный — серый, полупрозрачный.
- **Приоритет отрисовки:** группа → друзья → публичные.
- **Кластеры:** при отдалении (до зума 16) игроки собираются в кластер; кольцо кластера — по самому «близкому» игроку внутри. Тап по кластеру приближает карту и шлёт `clusterTap { layer: "players" }`, тап по игроку — `playerTap`.
- **Свой аватар** — отдельный маркер, всегда поверх. 3D-модели игроков — следующий шаг (`docs/map-visuals.md`).

## Магазин и гача

Только за игровые монеты. Шансы: обычная 70 %, редкая 25 %, легендарная 5 %. Гарантия: легендарка не позже 30-й крутки набора без неё, счётчик — `pullsToGuarantee` в `listShop`. Дубликат приносит осколки (5 / 15 / 50 по редкости). На витрине вещь покупается за монеты (обычная 150, редкая 450) или осколки (30 / 90 / 300); легендарки за монеты не продаются. Каталог вещей — `src/progress/catalog.ts`, правила — `src/progress/shop.ts`.

## Туман

Туман на профилях `medium` / `high` «дышит»: шум медленно плывёт, поверх идут крупные клубы. На границе с открытой областью стоят до 150 облачков-билбордов, они создают стену тумана. На профиле `low` туман статичный, облачков нет.

## Маршруты и мосты

Тайлы высот под мостом дают уровень воды, поэтому на отрезках маршрута по мосту (в 14 м от оси моста из `data/bridges.json`) высота берётся по прямой между берегами. Пешие маршруты OSRM не ведут по автомагистральным мостам (Золотой, Русский), поправка работает на мостах, где пешеход реально идёт.

## Дома

3D-дома видны только в открытой области и только в режиме 3D на профилях `medium` и `high`. Каждый дом — два слоя: стены с текстурой окон (`fill-extrusion-pattern`) и тонкая плита крыши с цветом по высоте. Низкие дома темнее, высотки светлее.

Ночью окна тёплые, часть горит; днём это холодные отражения. Свет сцены (`setLight`) тоже меняется. В режиме `auto` освещение пересматривается раз в 10 минут. Текстура окон пока рисуется кодом (`src/engine/buildings.ts`); текстуру Макса можно подставить картинками `windows-night` / `windows-day`.

## Метки, слои и кластеры

Метки из `showPlaces` кластеризуются: при отдалении близкие метки собираются в кружок с числом, с зума 16 видны по отдельности. Тап по кластеру сам приближает карту и присылает `clusterTap { lat, lon, count }`.

`setLayers` фильтрует метки по категориям меню «Слои». Фильтр работает до кластеризации, поэтому скрытые места не попадают в счётчики. Соответствие `kind` → слой: `quest`/`collect` → `quests`, `study`/`creative` → `study`, `leisure`/`food`/`outdoor` → `leisure`, `culture`/`history` → `history`, `event` → `events`.

Подписи у меток не висят постоянно. Тап по метке показывает кольцо и название и присылает `placeTap`; тап по пустой карте снимает выбор. Из списка в интерфейсе то же самое делает `selectPlace`.

## Районы и чекин

**Районы.** Город разбит на 36 микрорайонов: ячейка относится к ближайшему центру не дальше 1,8 км. Процент района — доля открытых **уличных** ячеек: пешеходные дороги из OSM, растеризованные в сетку тумана. Данные лежат в `data/districts.json`, собираются командой `npm run data:districts`. Когда целый процент района меняется, приходит событие `districtProgress`. На вехах 25 / 50 / 75 / 90 % приходит `districtMilestone`, а награда (опыт и монеты) — в `rewardGranted` с `source: "district"`. Каждая веха выдаётся один раз.

**Чекин.** `checkIn { placeId }` работает для мест, переданных в `showPlaces`. Если игрок дальше 60 м, ответ — `{ ok: false, distance, radius }`. Первая отметка в месте даёт +30 опыта и +10 монет (`rewardGranted`, `source: "checkin"`), повторные — без награды (`first: false`). Награды не за квест хранятся в `ProgressState.claimed` и не попадают в `completedQuests`.

## Аватар игрока

Карта рисует лёгкую SVG-заглушку вместо прежней стрелки. Стрелка курса остаётся отдельным элементом над персонажем. Экипировка из `ProgressState.equipped` применяется без перезагрузки; `admiral-cap` уже видна на маркере. `AvatarAppearance.modelUrl` зарезервирован под модель Макса: контракт менять не потребуется, когда заглушку заменим на 3D.

React Native управляет редактором и вызывает `equipAvatarItem` либо `setSelfAvatar`. Карта отвечает событием `avatarChanged`.

## Мобильный профиль производительности

Движок автоматически включает `low` при узком экране, coarse pointer или памяти устройства до 4 ГБ. Это профиль по умолчанию для Samsung Galaxy A24. Он не меняет геометрию домов и дорог:

- pixel ratio MapLibre ограничен до 1;
- canvas тумана ограничен 960 px;
- туман перерисовывается примерно 3 раза в секунду;
- 3D-дома отключены, но рельеф остаётся;
- 3D-наклон снижен до 40°;
- отключён fade тайлов и сокращены анимации камеры.

`balanced` включает до 3000 домов, canvas тумана 1280 px и pitch 50°. `high` включает полный профиль. Активные параметры доступны в `getState().renderProfile`. Качество можно переключить через `setRenderQuality`; для применения нового pixel ratio нужно перезапустить WebView, остальные параметры применяются сразу.

Минимальный сценарий приложения:

```ts
send({ id: "quests", type: "listQuests" });
send({ id: "start", type: "startQuestById", questId: "engine-demo-center" });

// activeStep.step.type === "quiz"
send({ id: "answer", type: "answerQuiz", answer: 1 });

// activeStep.step.type === "listen" && activeStep.runtime.audioReady
send({ id: "audio", type: "completeListen" });

// activeStep.step.type === "look" && activeStep.runtime.confirmationReady
send({ id: "look", type: "confirmLook" });
```

Для отладки из консоли браузера доступен `window.tuman.exec({...})`.

## Известные ограничения

- **Тайлы высот (Terrarium/AWS) срезают вершины.** Орлиное гнездо в них около 163 м, реальная высота заметно больше. Перепады для подъёмов на маршрутах они передают, но на мостах (Золотой, Русский) маршрут «ныряет» к уровню моря и даёт ложный подъём. Это надо будет учесть.
- **Подписи улиц видны и поверх тумана.** Отдельно их не спрятать: MapLibre рисует подписи после рельефа.
- **На маршруте в 3D дома местами закрывают линию.**
- **В заливе на отмывке видны ступенчатые полосы**: это артефакты морского дна в тайлах высот.
- **Сохранение только локальное**, в хранилище WebView. Синхронизацию сделаем через бэкенд.
- **Бандл около 1 МБ** (~290 КБ gzip), почти весь вес — MapLibre.
