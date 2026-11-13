// Протокол между приложением (React Native) и движком карты в WebView.
// Этот файл — контракт: его можно скопировать в RN-проект как есть.
//
// RN → карта:   webviewRef.current.postMessage(JSON.stringify(command))
// карта → RN:   onMessage={(e) => handle(JSON.parse(e.nativeEvent.data))}
//
// Команда с полем id получает ответ { type: "result", id, ok, data | error }.

export type LatLon = { lat: number; lon: number };

export type Place = {
  id: string;
  lat: number;
  lon: number;
  name?: string;
  kind?: string; // study | leisure | history | event | quest | collect — влияет на цвет метки
};

export type Command =
  | { id?: string; type: "setViewMode"; mode: "2d" | "3d" }
  | { id?: string; type: "setPlayerMode"; mode: "sim" | "external" | "gps" }
  | { id?: string; type: "gpsFix"; lat: number; lon: number; accuracy?: number; heading?: number }
  | { id?: string; type: "teleport"; lat: number; lon: number }
  | { id?: string; type: "walkTo"; lat: number; lon: number }
  | { id?: string; type: "follow"; on: boolean }
  | { id?: string; type: "flyTo"; lat: number; lon: number; zoom?: number }
  | { id?: string; type: "showPlaces"; places: Place[] }
  | { id?: string; type: "route"; to: LatLon; from?: LatLon } // ответ: RouteResult (без path — он уже на карте)
  | { id?: string; type: "clearRoute" }
  | { id?: string; type: "elevation"; lat: number; lon: number } // ответ: { h: number | null }
  | { id?: string; type: "revealAt"; lat: number; lon: number; radius?: number }
  | { id?: string; type: "resetFog" }
  | { id?: string; type: "getState" }; // ответ: State

export type State = {
  player: LatLon & { heading: number; mode: "sim" | "external" | "gps"; follow: boolean };
  viewMode: "2d" | "3d";
  fog: { cells: number; km2: number };
};

export type EngineEvent =
  | { type: "ready"; state: State }
  | { type: "playerMoved"; lat: number; lon: number; heading: number }
  | { type: "fogChanged"; cells: number; km2: number; fresh: number }
  | { type: "mapTap"; lat: number; lon: number }
  | { type: "mapLongPress"; lat: number; lon: number }
  | { type: "placeTap"; id: string }
  | { type: "result"; id: string; ok: boolean; data?: unknown; error?: string };
