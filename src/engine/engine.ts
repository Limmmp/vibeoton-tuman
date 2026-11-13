// Сборка движка карты: базовая карта + рельеф + туман + игрок + маршруты + метки.
// Наружу — объект Engine с командами (exec) и событиями (on). Мост к RN — в bridge.ts.

import type { Map as MLMap, GeoJSONSource } from "maplibre-gl";
import { createBaseMap, addTerrainLayers, addHillshadeOverFog, setViewMode, type ViewMode } from "./basemap";
import { FogOfWar, FogLayer } from "./fog";
import { Player } from "./player";
import { routeWithElevation } from "./route";
import { elevationAt } from "./dem";
import type { Command, EngineEvent, Place, State } from "./protocol";
import type { ActiveStep } from "../quests/types";
import { QuestRunner } from "../quests/runner";
import { resolveQuest } from "../quests/schema";
import { loadQuestSnapshot, saveQuestSnapshot } from "../quests/storage";
import { QUEST_CATALOG, questById } from "../quests/catalog";
import { ProgressManager } from "../progress/progress";
import { loadProgress, saveProgress } from "../progress/storage";
import { AVATAR_ITEMS } from "../progress/catalog";
import { appearanceFromProgress } from "../progress/avatar";
import type { AvatarAppearance } from "../progress/types";
import { detectRenderProfile, profileFor, saveRenderQuality, type RenderProfile, type RenderQuality } from "./performance";
import { DistrictTracker } from "../progress/districts";
import type { DistrictData } from "../data/districts";
import districtsJson from "../../data/districts.json";
import { distance } from "./geo";

// Чекин: игрок должен быть не дальше этого от места; первая отметка в месте даёт награду.
const CHECKIN_RADIUS = 60;
const CHECKIN_REWARD = { xp: 30, cash: 10, rep: 0, items: [] as string[] };

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
  private quests: QuestRunner;
  private progress: ProgressManager;
  private avatar: AvatarAppearance;
  private fogLayer: FogLayer | null = null;
  private districts = new DistrictTracker(districtsJson as DistrictData[]);
  private places = new Map<string, Place>(); // последние метки из showPlaces — для чекина

  private constructor(readonly map: MLMap, readonly fog: FogOfWar, readonly player: Player, renderProfile: RenderProfile) {
    this.renderProfile = renderProfile;
    this.progress = new ProgressManager({ initial: loadProgress(), save: saveProgress, emit: (event) => {
      if (event.type === "inventoryChanged") this.applyAvatar(appearanceFromProgress(this.progress.state));
      this.emit(event);
    } });
    this.avatar = appearanceFromProgress(this.progress.state);
    this.player.setAvatar(this.avatar);
    this.quests = new QuestRunner({
      emit: (event) => {
        if (event.type === "activeStep") this.drawQuestTargets(event.active);
        else if (event.type === "questDone" || event.type === "questFailed" || event.type === "questStopped") this.drawQuestTargets(null);
        this.emit(event);
        if (event.type === "questDone") this.progress.grantQuestReward({ questId: event.questId, title: event.questTitle, reward: event.reward, trusted: event.trusted });
      },
      save: saveQuestSnapshot,
    });
  }

  renderProfile: RenderProfile;

  static async create(container: HTMLElement | string): Promise<Engine> {
    const renderProfile = detectRenderProfile();
    const map = await createBaseMap(container, undefined, renderProfile);
    await new Promise<void>((r) => map.once("load", () => r()));
    const beforeId = addTerrainLayers(map);
    const fog = new FogOfWar();
    const fogLayer = new FogLayer(map, fog, beforeId, renderProfile);
    addHillshadeOverFog(map, beforeId);
    addOverlayLayers(map, beforeId);
    const player = new Player(map);
    const engine = new Engine(map, fog, player, renderProfile);
    engine.fogLayer = fogLayer;
    engine.wire();
    const savedQuest = loadQuestSnapshot();
    if (savedQuest) {
      try {
        engine.quests.restore(savedQuest, { position: player.pos, fogCells: fog.cells.size });
      } catch (error) {
        console.warn("[quests] Не удалось восстановить квест", error);
        saveQuestSnapshot(null);
      }
    }
    return engine;
  }

  on(fn: Handler) {
    this.handlers.push(fn);
  }

  private emit(e: EngineEvent) {
    this.handlers.forEach((fn) => fn(e));
  }

  private applyAvatar(appearance: AvatarAppearance) {
    this.avatar = { ...appearance, equipped: { ...appearance.equipped } };
    this.player.setAvatar(this.avatar);
    this.emit({ type: "avatarChanged", appearance: this.avatar });
  }

  private setRenderQuality(quality: RenderQuality) {
    saveRenderQuality(quality);
    const pixelRatio = this.renderProfile.pixelRatio;
    this.renderProfile = { ...profileFor(quality, this.renderProfile.mobile, window.devicePixelRatio || 1), pixelRatio };
    this.fogLayer?.setProfile(this.renderProfile);
    if (!this.renderProfile.show3dBuildings) {
      this.map.setLayoutProperty("building-3d", "visibility", "none");
      (this.map.getSource("lit-buildings") as GeoJSONSource).setData(EMPTY);
    }
    if (this.viewMode === "3d") {
      setViewMode(this.map, "3d", this.renderProfile);
      this.updateBuildings();
    }
    this.emit({ type: "renderQualityChanged", profile: this.renderProfile });
    return this.renderProfile;
  }

  private drawQuestTargets(active: ActiveStep | null) {
    const source = this.map.getSource("quest-targets") as GeoJSONSource | undefined;
    if (!source) return;
    source.setData({
      type: "FeatureCollection",
      features: (active?.targets ?? []).filter((target) => !target.done).map((target) => ({
        type: "Feature",
        properties: { id: target.id, name: target.name, kind: target.kind },
        geometry: { type: "Point", coordinates: [target.lon, target.lat] },
      })),
    });
  }

  private claimMilestone(hit: { districtId: string; name: string; pct: number; reward: { xp: number; cash: number; rep: number; items: string[] } }) {
    const key = `district:${hit.districtId}:${hit.pct}`;
    if (this.progress.isClaimed(key)) return;
    this.emit({ type: "districtMilestone", id: hit.districtId, name: hit.name, pct: hit.pct });
    this.progress.grantReward({ key, source: "district", title: `${hit.name}: открыто ${hit.pct} %`, reward: hit.reward, trusted: true });
  }

  /** Отметиться в месте из showPlaces. Награда — только за первую отметку. */
  private checkIn(placeId: string) {
    const place = this.places.get(placeId);
    if (!place) throw new Error("Место не показано на карте — сначала showPlaces");
    const dist = Math.round(distance(this.player.pos, place));
    if (dist > CHECKIN_RADIUS) return { ok: false as const, distance: dist, radius: CHECKIN_RADIUS };
    this.fog.reveal(place, CHECKIN_RADIUS);
    const result = this.progress.grantReward({ key: `checkin:${placeId}`, source: "checkin", title: place.name ?? placeId, reward: CHECKIN_REWARD, trusted: true });
    this.emit({ type: "checkedIn", placeId, first: result.granted });
    return { ok: true as const, distance: dist, first: result.granted, reward: result.granted ? result.reward : null };
  }

  state(): State {
    const p = this.player;
    return {
      player: { ...p.pos, heading: p.heading, mode: p.mode, follow: p.follow },
      viewMode: this.viewMode,
      fog: { cells: this.fog.cells.size, km2: +this.fog.areaKm2().toFixed(4) },
      quest: this.quests.active,
      progress: this.progress.state,
      avatar: { ...this.avatar, equipped: { ...this.avatar.equipped } },
      renderProfile: this.renderProfile,
    };
  }

  private wire() {
    const { map, fog, player } = this;
    fog.reveal(player.pos);

    player.onMove((pos, prev, jump) => {
      if (jump) fog.reveal(pos); else fog.revealPath(prev, pos);
      this.quests.updatePosition(pos);
      this.emit({ type: "playerMoved", lat: pos.lat, lon: pos.lon, heading: player.heading });
    });
    fog.onChange((fresh) => {
      this.quests.updateFog(fog.cells.size);
      this.emit({ type: "fogChanged", cells: fog.cells.size, km2: +fog.areaKm2().toFixed(4), fresh });
    });

    // Районы: процент открытых уличных ячеек и вехи 25/50/75/90 % с наградой (один раз на веху).
    this.districts.recount(fog.cells);
    for (const hit of this.districts.reachedMilestones()) this.claimMilestone(hit); // догоняем вехи, пройденные до обновления
    fog.onChange((_fresh, keys) => {
      if (!keys.length) { this.districts.recount(fog.cells); return; } // сброс тумана
      const before = new Map(this.districts.stats().map((d) => [d.id, d.pct]));
      const hits = this.districts.add(keys);
      for (const d of this.districts.stats()) {
        if (d.pct !== before.get(d.id)) this.emit({ type: "districtProgress", id: d.id, name: d.name, pct: d.pct, revealed: d.revealed, total: d.total });
      }
      for (const hit of hits) this.claimMilestone(hit);
    });

    // 3D-дома — только в открытой области: берём дома из загруженных тайлов, оставляем те,
    // у которых ячейка тумана под первой вершиной открыта, и кладём их в GeoJSON-источник lit-buildings.
    let bTimer: ReturnType<typeof setTimeout> | undefined;
    const updateBuildings = () => {
      if (bTimer || this.viewMode !== "3d" || !this.renderProfile.show3dBuildings) return;
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
            if (out.length > this.renderProfile.buildingLimit) break outer;
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
      const questHit = map.queryRenderedFeatures(e.point, { layers: ["quest-targets"] })[0];
      if (questHit) return this.emit({ type: "questTargetTap", id: String(questHit.properties?.id) });
      const hit = map.queryRenderedFeatures(e.point, { layers: ["places"] })[0];
      if (hit) return this.emit({ type: "placeTap", id: String(hit.properties?.id) });
      const p = { lat: e.lngLat.lat, lon: e.lngLat.lng };
      if (player.mode === "sim") player.walkTo(p);
      this.emit({ type: "mapTap", ...p, action: player.mode === "sim" ? "walk" : "select" });
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
      this.quests.tick(dt * player.timeScale);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  /** Выполнить команду. Возвращает данные для ответа (если есть). */
  async exec(cmd: Command): Promise<unknown> {
    const { map, fog, player } = this;
    switch (cmd.type) {
      case "setRenderQuality":
        return this.setRenderQuality(cmd.quality);
      case "setViewMode":
        this.viewMode = cmd.mode;
        setViewMode(map, cmd.mode, this.renderProfile);
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
        this.places = new Map(cmd.places.map((p) => [p.id, p]));
        (map.getSource("places") as GeoJSONSource).setData(placesGeoJSON(cmd.places));
        return;
      case "checkIn":
        return this.checkIn(cmd.placeId);
      case "getDistricts":
        return this.districts.stats();
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
      case "listQuests":
        return QUEST_CATALOG.map(({ id, title, giver, intro, reward, start, source, steps }) => ({ id, title, giver, intro, reward, start, source, stepCount: steps.length }));
      case "startQuestById": {
        const quest = questById(cmd.questId);
        if (!quest) throw new Error(`Квест не найден: ${cmd.questId}`);
        return this.quests.start(quest, { position: player.pos, fogCells: fog.cells.size, trusted: true });
      }
      case "startQuest":
        return this.quests.start(resolveQuest(cmd.quest, undefined, cmd.quest.source), { position: player.pos, fogCells: fog.cells.size });
      case "stopQuest":
        this.quests.stop();
        return;
      case "answerQuiz":
        return this.quests.answerQuiz(cmd.answer);
      case "completeListen":
        this.quests.completeListen();
        return;
      case "confirmLook":
        this.quests.confirmLook();
        return;
      case "getQuestState":
        return this.quests.active;
      case "getProgress":
        return this.progress.state;
      case "setSelfAvatar":
        this.applyAvatar(cmd.appearance);
        return this.avatar;
      case "listAvatarItems":
        return AVATAR_ITEMS;
      case "equipAvatarItem":
        return this.progress.equip(cmd.itemId);
      case "unequipAvatarSlot":
        return this.progress.unequip(cmd.slot);
      case "resetProgress":
        return this.progress.reset();
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
  map.addSource("quest-targets", { type: "geojson", data: EMPTY });
  map.addLayer({
    id: "quest-targets", type: "circle", source: "quest-targets",
    paint: {
      "circle-radius": ["match", ["get", "kind"], "tail", 10, "collect", 9, 11],
      "circle-color": ["match", ["get", "kind"], "tail", "#FF7A6B", "collect", "#5BC07A", "#F5B83D"],
      "circle-stroke-color": "#F4F6F8", "circle-stroke-width": 3,
    },
  });
}
