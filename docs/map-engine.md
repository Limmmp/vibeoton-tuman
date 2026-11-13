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
| `getState` | позиция, режимы, туман, квест и профиль | `State` |

**События (карта → приложение):** `ready`, `playerMoved`, `fogChanged`, `mapTap`, `mapLongPress`, `placeTap`, `questTargetTap`, `activeStep`, `stepDone`, `questDone`, `questFailed`, `questStopped`, `progressChanged`, `rewardGranted`, `inventoryChanged`, `renderQualityChanged`, `result`.

`mapTap.action` равен `walk` только в симуляции. При включённом GPS/`external` тап не двигает аватар и приходит как `select`: приложение может выбрать точку или построить маршрут. После отключения GPS нужно отправить `setPlayerMode { mode: "sim" }`, тогда тапы снова запускают демопрогулку.

Квестовый движок не рисует интерфейс React Native. Приложение получает `activeStep`, показывает текст, аудио и варианты ответа, затем отправляет команду подтверждения. Шаги `goto`, `hold`, `tail`, `collect`, `explore` и `visit` отслеживает движок. Для `listen` и `look` сначала нужен геотриггер у точки; готовность приходит в `activeStep.runtime`.

`activeStep.targets` содержит вычисленные цели текущего шага. Движок сам показывает их янтарными, зелёными или коралловыми метками. `distanceMeters` — расстояние до ближайшей незавершённой цели. `progress` содержит `current`, `total` и единицу измерения. Нажатие по метке даёт `questTargetTap`; приложение решает, строить ли маршрут или открывать подсказку.

Встроенный технический квест `engine-demo-center` лежит в [`src/quests/catalog.ts`](../src/quests/catalog.ts). Он использует реальные координаты мест из OSM, но не содержит исторических утверждений. В браузерной отладочной панели кнопка «Тест-квест» переносит игрока к старту. Нажатие по целевой метке запускает движение в режиме `sim`.

Активный квест сохраняется в `localStorage` WebView и восстанавливается при запуске. Типы квеста экспортируются из [`src/engine/protocol.ts`](../src/engine/protocol.ts); исходная логика лежит в `src/quests/`.

## Прогресс и награды

Встроенный квест может выдать `xp`, `cash`, `rep` и косметические `items`. Награда выдаётся один раз на `questId`. Повторное прохождение возвращает `rewardGranted` с `granted: false` и `reason: "already-completed"`. Внешний `startQuest` проходит механику, но не выдаёт награду: событие содержит `reason: "untrusted-quest"`. Это не позволяет приложению подставить квест с произвольной валютой.

Профиль хранится локально в WebView. `completedQuests` содержит историю завершений и полученные награды. `inventory` хранит количество предметов, `equipped` — выбранный предмет по слоту. Сейчас в каталоге есть тестовая `admiral-cap`, которую выдаёт `engine-demo-center`.

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
