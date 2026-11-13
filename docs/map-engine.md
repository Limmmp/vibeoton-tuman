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

Полный контракт с типами — в [`src/engine/protocol.ts`](../src/engine/protocol.ts). Его можно копировать в RN-проект как есть.

**Команды (приложение → карта).** Если у команды есть `id`, карта отвечает событием `result` с тем же `id`.

| Команда | Что делает | Ответ |
| --- | --- | --- |
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
| `getState` | позиция, режимы, статистика тумана | `State` |

**События (карта → приложение):** `ready`, `playerMoved`, `fogChanged`, `mapTap`, `mapLongPress`, `placeTap`, `result`.

Для отладки из консоли браузера доступен `window.tuman.exec({...})`.

## Известные ограничения

- **Тайлы высот (Terrarium/AWS) срезают вершины.** Орлиное гнездо в них около 163 м, реальная высота заметно больше. Перепады для подъёмов на маршрутах они передают, но на мостах (Золотой, Русский) маршрут «ныряет» к уровню моря и даёт ложный подъём. Это надо будет учесть.
- **Подписи улиц видны и поверх тумана.** Отдельно их не спрятать: MapLibre рисует подписи после рельефа.
- **На маршруте в 3D дома местами закрывают линию.**
- **Сохранение только локальное**, в хранилище WebView. Синхронизацию сделаем через бэкенд.
- **Бандл около 1 МБ** (~290 КБ gzip), почти весь вес — MapLibre.
