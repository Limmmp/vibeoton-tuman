// Сборка движка карты: базовая карта + рельеф + туман + игрок + маршруты + метки.
// Наружу — объект Engine с командами (exec) и событиями (on). Мост к RN — в bridge.ts.

import type { Map as MLMap, GeoJSONSource } from "maplibre-gl";
import { createBaseMap, addTerrainLayers, addHillshadeOverFog, setViewMode, type ViewMode } from "./basemap";
import { FogOfWar, FogLayer } from "./fog";
import { Player } from "./player";
import { routeWithElevation } from "./route";
import { elevationAt } from "./dem";
import type { Command, EngineEvent, Place, State } from "./protocol";

type Handler = (e: EngineEvent) => void;

// Цвета меток — из палитры диз-дока: учёба/творчество — бирюза, досуг/еда/события — коралл,
// культура/история — медь, прогулки — зелёный, задания и коллекция — янтарь.
const KIND_COLORS: Record<string, string> = {
  study: "#3FB8AF", creative: "#3FB8AF",
  leisure: "#FF7A6B", food: "#FF7A6B", event: "#FF7A6B",
  culture: "#C98B5A", history: "#C98B5A",
  outdoor: "#5BC07A",
  quest: "#F5B83D", collect: "#F5B83D",
};

export class Engine {
  viewMode: ViewMode = "2d";
  private handlers: Handler[] = [];
  private updateBuildings: () => void = () => {};

  private constructor(readonly map: MLMap, readonly fog: FogOfWar, readonly player: Player) {}

  static async create(container: HTMLElement | string): Promise<Engine> {
    const map = await createBaseMap(container);
    await new Promise<void>((r) => map.once("load", () => r()));
    const beforeId = addTerrainLayers(map);
    const fog = new FogOfWar();
    new FogLayer(map, fog, beforeId);
    addHillshadeOverFog(map, beforeId);
    addOverlayLayers(map, beforeId);
    const player = new Player(map);
    const engine = new Engine(map, fog, player);
    engine.wire();
    return engine;
  }

  on(fn: Handler) {
    this.handlers.push(fn);
  }

  private emit(e: EngineEvent) {
    this.handlers.forEach((fn) => fn(e));
  }

  state(): State {
    const p = this.player;
    return {
      player: { ...p.pos, heading: p.heading, mode: p.mode, follow: p.follow },
      viewMode: this.viewMode,
      fog: { cells: this.fog.cells.size, km2: +this.fog.areaKm2().toFixed(4) },
    };
  }

  private wire() {
    const { map, fog, player } = this;
    fog.reveal(player.pos);

    player.onMove((pos, prev, jump) => {
      if (jump) fog.reveal(pos); else fog.revealPath(prev, pos);
      this.emit({ type: "playerMoved", lat: pos.lat, lon: pos.lon, heading: player.heading });
    });
    fog.onChange((fresh) => this.emit({ type: "fogChanged", cells: fog.cells.size, km2: +fog.areaKm2().toFixed(4), fresh }));

    // 3D-дома — только в открытой области: берём дома из загруженных тайлов, оставляем те,
    // у которых ячейка тумана под первой вершиной открыта, и кладём их в GeoJSON-источник lit-buildings.
    let bTimer: ReturnType<typeof setTimeout> | undefined;
    const updateBuildings = () => {
      if (bTimer || this.viewMode !== "3d") return;
      bTimer = setTimeout(() => {
        bTimer = undefined;
        const out: GeoJSON.Feature[] = [];
        const seen = new Set<string>();
        // В тайлах много зданий склеены в один MultiPolygon, поэтому проверяем каждый полигон отдельно.
        outer: for (const f of map.querySourceFeatures("openmaptiles", { sourceLayer: "building" })) {
          const g = f.geometry;
          const polys = g.type === "Polygon" ? [g.coordinates] : g.type === "MultiPolygon" ? g.coordinates : [];
          const props = { h: f.properties?.render_height, b: f.properties?.render_min_height };
          for (const rings of polys) {
            const first = rings[0]?.[0];
            if (!first || !fog.isRevealed({ lon: first[0], lat: first[1] })) continue;
            const key = `${first[0].toFixed(7)},${first[1].toFixed(7)}`; // один дом приходит из соседних тайлов
            if (seen.has(key)) continue;
            seen.add(key);
            out.push({ type: "Feature", geometry: { type: "Polygon", coordinates: rings }, properties: props });
            if (out.length > 8000) break outer;
          }
        }
        (map.getSource("lit-buildings") as GeoJSONSource).setData({ type: "FeatureCollection", features: out });
      }, 300);
    };
    this.updateBuildings = updateBuildings;
    fog.onChange(updateBuildings);
    map.on("moveend", updateBuildings);
    map.on("sourcedata", (e) => e.sourceId === "openmaptiles" && e.isSourceLoaded && updateBuildings());

    // Тап по метке → placeTap; по пустой карте → mapTap (в симуляции ещё и идём туда).
    map.on("click", (e) => {
      const hit = map.queryRenderedFeatures(e.point, { layers: ["places"] })[0];
      if (hit) return this.emit({ type: "placeTap", id: String(hit.properties?.id) });
      const p = { lat: e.lngLat.lat, lon: e.lngLat.lng };
      player.walkTo(p);
      this.emit({ type: "mapTap", ...p });
    });
    // Долгое нажатие / правый клик → mapLongPress (интерфейс решает, что делать: например, маршрут).
    map.on("contextmenu", (e) => this.emit({ type: "mapLongPress", lat: e.lngLat.lat, lon: e.lngLat.lng }));
    let pressTimer: ReturnType<typeof setTimeout> | undefined;
    map.on("touchstart", (e) => {
      if (e.originalEvent.touches.length !== 1) return;
      pressTimer = setTimeout(() => this.emit({ type: "mapLongPress", lat: e.lngLat.lat, lon: e.lngLat.lng }), 550);
    });
    for (const ev of ["touchend", "touchmove", "touchcancel"] as const) map.on(ev, () => clearTimeout(pressTimer));

    // Игровой цикл.
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      player.tick(dt);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  /** Выполнить команду. Возвращает данные для ответа (если есть). */
  async exec(cmd: Command): Promise<unknown> {
    const { map, fog, player } = this;
    switch (cmd.type) {
      case "setViewMode":
        this.viewMode = cmd.mode;
        setViewMode(map, cmd.mode);
        this.updateBuildings();
        return;
      case "setPlayerMode":
        return player.setMode(cmd.mode);
      case "gpsFix":
        player.externalFix(cmd);
        return;
      case "teleport":
        player.teleport(cmd);
        return;
      case "walkTo":
        player.walkTo(cmd);
        return;
      case "follow":
        player.follow = cmd.on;
        if (cmd.on) map.easeTo({ center: [player.pos.lon, player.pos.lat] });
        return;
      case "flyTo":
        player.follow = false;
        map.flyTo({ center: [cmd.lon, cmd.lat], zoom: cmd.zoom ?? map.getZoom() });
        return;
      case "showPlaces":
        (map.getSource("places") as GeoJSONSource).setData(placesGeoJSON(cmd.places));
        return;
      case "route": {
        const r = await routeWithElevation(cmd.from ?? player.pos, cmd.to);
        (map.getSource("route") as GeoJSONSource).setData({
          type: "Feature", properties: {},
          geometry: { type: "LineString", coordinates: r.path.map((p) => [p.lon, p.lat]) },
        });
        const { path: _path, ...rest } = r;
        return rest;
      }
      case "clearRoute":
        (map.getSource("route") as GeoJSONSource).setData(EMPTY);
        return;
      case "elevation":
        return { h: await elevationAt(cmd) };
      case "revealAt":
        return fog.reveal(cmd, cmd.radius);
      case "resetFog":
        fog.reset();
        fog.reveal(player.pos);
        return;
      case "getState":
        return this.state();
    }
  }
}

const EMPTY: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [] };

function placesGeoJSON(places: Place[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: places.map((p) => ({
      type: "Feature",
      properties: { id: p.id, name: p.name ?? "", color: KIND_COLORS[p.kind ?? ""] ?? "#F5B83D" },
      geometry: { type: "Point", coordinates: [p.lon, p.lat] },
    })),
  };
}

/** Маршрут и метки — поверх тумана, под подписями. */
function addOverlayLayers(map: MLMap, beforeId?: string) {
  map.addSource("route", { type: "geojson", data: EMPTY });
  map.addLayer({ id: "route-casing", type: "line", source: "route", layout: { "line-join": "round", "line-cap": "round" }, paint: { "line-color": "#0F1720", "line-width": 8 } }, beforeId);
  map.addLayer({ id: "route", type: "line", source: "route", layout: { "line-join": "round", "line-cap": "round" }, paint: { "line-color": "#F5B83D", "line-width": 4 } }, beforeId);
  map.addSource("places", { type: "geojson", data: EMPTY });
  map.addLayer({
    id: "places", type: "circle", source: "places",
    paint: { "circle-radius": 8, "circle-color": ["get", "color"], "circle-stroke-color": "#F4F6F8", "circle-stroke-width": 2 },
  });
}
