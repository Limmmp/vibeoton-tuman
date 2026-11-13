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
import { QUEST_CATALOG, QUEST_REQUIRES, questById } from "../quests/catalog";
import { ProgressManager } from "../progress/progress";
import { loadProgress, saveProgress } from "../progress/storage";
import { AVATAR_ITEMS } from "../progress/catalog";
import { shopInfo } from "../progress/shop";
import { appearanceFromProgress } from "../progress/avatar";
import type { AvatarAppearance } from "../progress/types";
import { detectRenderProfile, profileFor, saveRenderQuality, type RenderProfile, type RenderQuality } from "./performance";
import { DistrictTracker } from "../progress/districts";
import type { DistrictData } from "../data/districts";
import districtsJson from "../../data/districts.json";
import { distance } from "./geo";
import { MAP_LAYERS, normalizeLayers, visiblePlaces, type MapLayer } from "./layers";
import { applyLighting, setBuildingsVisible, type LightingMode } from "./buildings";
import { playersGeoJSON, validatePlayer, visiblePlayers, type OtherPlayer, type SocialMode } from "./players";
import { BuildingIndex } from "./building-index";
import { load, save } from "./storage";
import { BasemapFallback } from "./basemap-fallback";
import { LANDMARKS } from "../models/catalog";

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
  private renderActive = true;
  private fogEffects = load<boolean>("fog-effects", true);
  private buildingIndex = new BuildingIndex();
  private demoTapMode: "walk" | "teleport" = "walk";
  private landmarksLoading = false;
  private landmarkBefore: string | undefined;
  private districts = new DistrictTracker(districtsJson as DistrictData[]);
  private places = new Map<string, Place>(); // последние метки из showPlaces — для чекина
  private layers: MapLayer[] = [...MAP_LAYERS]; // видимые категории меток (setLayers)
  private selectedPlace: string | null = null;
  private others = new Map<string, OtherPlayer>(); // другие игроки (showPlayers / updatePlayers)
  private social: SocialMode = "all"; // кого из них показывать (setSocialLayer)
  private lighting: LightingMode = "auto"; // окна и свет: по времени Владивостока или принудительно

  private constructor(readonly map: MLMap, readonly fog: FogOfWar, readonly player: Player, renderProfile: RenderProfile, private basemap: BasemapFallback) {
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
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => { map.remove(); reject(new Error("Карта не загрузилась за 25 секунд")); }, 25000);
      map.once("style.load", () => { clearTimeout(timer); resolve(); });
    });
    const basemap = new BasemapFallback(map);
    const beforeId = addTerrainLayers(map);
    const fog = new FogOfWar();
    const fogLayer = new FogLayer(map, fog, beforeId, renderProfile);
    addHillshadeOverFog(map, beforeId, renderProfile);
    addOverlayLayers(map, beforeId);
    const player = new Player(map);
    const engine = new Engine(map, fog, player, renderProfile, basemap);
    engine.landmarkBefore = beforeId;
    map.addSource("landmarks", { type: "geojson", data: { type: "FeatureCollection", features: LANDMARKS.map(item => ({ type: "Feature", properties: { id: item.id, name: item.name }, geometry: { type: "Point", coordinates: [item.lon, item.lat] } })) } });
    map.addLayer({ id: "landmark-pins", type: "circle", source: "landmarks", minzoom: 12, paint: { "circle-radius": 8, "circle-color": "#f5b83d", "circle-stroke-width": 2, "circle-stroke-color": "#172633" } });
    map.addLayer({ id: "landmark-labels", type: "symbol", source: "landmarks", minzoom: 14, layout: { "text-field": ["get", "name"], "text-size": 12, "text-offset": [0, 1.6] }, paint: { "text-color": "#172633", "text-halo-color": "#fff", "text-halo-width": 1.5 } });
    basemap.onChange(status => {
      engine.emit({ type: "basemapChanged", status });
      if (status.message) engine.emit({ type: "mapError", message: status.message });
    });
    engine.fogLayer = fogLayer;
    fogLayer.setEffects(engine.fogEffects);
    map.jumpTo({ center: [player.pos.lon, player.pos.lat] });
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
    this.renderProfile = profileFor(quality, this.renderProfile.mobile, window.devicePixelRatio || 1);
    this.map.setPixelRatio(this.renderProfile.pixelRatio);
    this.map.setLayoutProperty("hillshade-over-fog", "visibility", this.renderProfile.hillshade ? "visible" : "none");
    this.buildingIndex.invalidate();
    this.fogLayer?.setProfile(this.renderProfile);
    void this.ensureLandmarkLayer();
    if (!this.renderProfile.show3dBuildings) {
      setBuildingsVisible(this.map, false);
      (this.map.getSource("lit-buildings") as GeoJSONSource).setData(EMPTY);
    }
    if (this.viewMode === "3d") {
      setViewMode(this.map, "3d", this.renderProfile);
      this.updateBuildings();
    }
    this.emit({ type: "renderQualityChanged", profile: this.renderProfile });
    return this.renderProfile;
  }

  private async ensureLandmarkLayer() {
    if (!this.renderProfile.show3dBuildings) {
      if (this.map.getLayer("landmark-models")) this.map.removeLayer("landmark-models");
      return;
    }
    if (this.viewMode !== "3d" || this.landmarksLoading || this.map.getLayer("landmark-models")) return;
    this.landmarksLoading = true;
    try {
      const { LandmarkLayer } = await import("../models/map-layer");
      if (this.viewMode !== "3d" || !this.renderProfile.show3dBuildings) return;
      this.map.addLayer(new LandmarkLayer(item => this.renderActive && !document.hidden && this.viewMode === "3d" && this.renderProfile.show3dBuildings && this.map.getZoom() >= 14 && this.fog.isRevealed(item) && distance(item, { lat: this.map.getCenter().lat, lon: this.map.getCenter().lng }) < 2000), this.landmarkBefore);
    } catch (error) {
      this.emit({ type: "mapError", message: `Не удалось открыть 3D-модели: ${(error as Error).message}` });
    } finally { this.landmarksLoading = false; }
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

  /** Перерисовать метки: только места из включённых слоёв (до кластеризации, чтобы скрытые не попадали в счётчики). */
  private refreshPlaces() {
    const shown = visiblePlaces([...this.places.values()], this.layers);
    (this.map.getSource("places") as GeoJSONSource).setData(placesGeoJSON(shown));
    if (this.selectedPlace && !shown.some((p) => p.id === this.selectedPlace)) this.selectPlace(null);
  }

  private refreshPlayers() {
    (this.map.getSource("players") as GeoJSONSource).setData(playersGeoJSON(visiblePlayers(this.others.values(), this.social)));
  }

  private upsertPlayers(list: OtherPlayer[]) {
    for (const p of list) {
      const err = validatePlayer(p);
      if (err) throw new Error(`Игрок: ${err}`);
      this.others.set(p.id, { ...this.others.get(p.id), ...p });
    }
  }

  /** Подпись и кольцо у выбранной метки. null — снять выбор. */
  private selectPlace(id: string | null) {
    const place = id ? this.places.get(id) : undefined;
    this.selectedPlace = place ? place.id : null;
    (this.map.getSource("place-selected") as GeoJSONSource).setData(place ? {
      type: "FeatureCollection",
      features: [{ type: "Feature", properties: { name: place.name ?? "", color: KIND_COLORS[place.kind ?? ""] ?? "#F5B83D" }, geometry: { type: "Point", coordinates: [place.lon, place.lat] } }],
    } : EMPTY);
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
      player: { ...p.pos, heading: p.heading, mode: p.mode, follow: p.follow, simSpeed: p.simSpeed },
      demoTapMode: this.demoTapMode,
      viewMode: this.viewMode,
      fog: { cells: this.fog.cells.size, km2: +this.fog.areaKm2().toFixed(4) },
      quest: this.quests.active,
      progress: this.progress.state,
      avatar: { ...this.avatar, equipped: { ...this.avatar.equipped } },
      renderProfile: this.renderProfile,
      engineVersion: "demo-collection-5",
      basemap: { ...this.basemap.status },
      fogEffects: this.fogEffects,
      layers: [...this.layers],
    };
  }

  private wire() {
    const { map, fog, player } = this;
    fog.reveal(player.pos);

    // Окна и свет по времени суток во Владивостоке; в режиме auto пересматриваем раз в 10 минут.
    applyLighting(map, this.lighting);
    setInterval(() => this.lighting === "auto" && applyLighting(map, "auto"), 10 * 60000);

    let lastMoveEvent = -Infinity;
    let moveTimer: ReturnType<typeof setTimeout> | undefined;
    const publishPosition = () => {
      clearTimeout(moveTimer);
      moveTimer = undefined;
      lastMoveEvent = performance.now();
      this.emit({ type: "playerMoved", ...player.pos, heading: player.heading });
    };
    player.onMove((pos, prev, jump) => {
      if (jump) fog.reveal(pos); else fog.revealPath(prev, pos);
      this.quests.updatePosition(pos);
      const remaining = 250 - (performance.now() - lastMoveEvent);
      if (jump || remaining <= 0) publishPosition();
      else if (!moveTimer) moveTimer = setTimeout(publishPosition, remaining);
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
    let tilesDirty = true;
    const updateBuildings = () => {
      if (bTimer || !this.renderActive || this.viewMode !== "3d" || !this.renderProfile.show3dBuildings) return;
      bTimer = setTimeout(() => {
        bTimer = undefined;
        if (!this.renderActive || this.viewMode !== "3d" || !this.renderProfile.show3dBuildings) return;
        // В тайлах много зданий склеены в один MultiPolygon, поэтому проверяем каждый полигон отдельно.
        if (tilesDirty && map.getSource("openmaptiles")) {
          // один дом приходит из соседних тайлов
          this.buildingIndex.replace(map.querySourceFeatures("openmaptiles", { sourceLayer: "building" }));
          tilesDirty = false;
        }
        const bounds = map.getBounds();
        const win = { w: bounds.getWest(), e: bounds.getEast(), s: bounds.getSouth(), n: bounds.getNorth() };
        const out = this.buildingIndex.select(fog.index.inWindow(win), win, this.renderProfile.buildingLimit);
        if (out) (map.getSource("lit-buildings") as GeoJSONSource).setData({ type: "FeatureCollection", features: out });
      }, 300);
    };
    this.updateBuildings = updateBuildings;
    fog.onChange(updateBuildings);
    map.on("moveend", updateBuildings);
    map.on("sourcedata", (e) => {
      if (e.sourceId !== "openmaptiles" || (e.sourceDataType !== "content" && !("tile" in e))) return;
      tilesDirty = true;
      updateBuildings();
    });

    // Тап по цели квеста → questTargetTap; по кластеру → приблизить и clusterTap;
    // по метке → подпись + placeTap; по пустой карте → mapTap (в симуляции ещё и идём туда).
    map.on("click", (e) => {
      const landmark = map.queryRenderedFeatures(e.point, { layers: ["landmark-pins"] })[0];
      if (landmark) return this.emit({ type: "landmarkTap", id: String(landmark.properties?.id) });
      const questHit = map.queryRenderedFeatures(e.point, { layers: ["quest-targets"] })[0];
      if (questHit) return this.emit({ type: "questTargetTap", id: String(questHit.properties?.id) });
      const playerHit = map.queryRenderedFeatures(e.point, { layers: ["players"] })[0];
      if (playerHit) return this.emit({ type: "playerTap", id: String(playerHit.properties?.id) });
      const playersCluster = map.queryRenderedFeatures(e.point, { layers: ["players-clusters"] })[0];
      if (playersCluster && playersCluster.geometry.type === "Point") {
        const [lon, lat] = playersCluster.geometry.coordinates;
        player.follow = false;
        (map.getSource("players") as GeoJSONSource)
          .getClusterExpansionZoom(Number(playersCluster.properties?.cluster_id))
          .then((zoom) => map.easeTo({ center: [lon, lat], zoom: Math.min(zoom + 0.3, 19) }))
          .catch(() => map.easeTo({ center: [lon, lat], zoom: map.getZoom() + 2 }));
        return this.emit({ type: "clusterTap", lat, lon, count: Number(playersCluster.properties?.point_count ?? 0), layer: "players" });
      }
      const cluster = map.queryRenderedFeatures(e.point, { layers: ["places-clusters"] })[0];
      if (cluster && cluster.geometry.type === "Point") {
        const [lon, lat] = cluster.geometry.coordinates;
        const count = Number(cluster.properties?.point_count ?? 0);
        player.follow = false;
        (map.getSource("places") as GeoJSONSource)
          .getClusterExpansionZoom(Number(cluster.properties?.cluster_id))
          .then((zoom) => map.easeTo({ center: [lon, lat], zoom: Math.min(zoom + 0.3, 18) }))
          .catch(() => map.easeTo({ center: [lon, lat], zoom: map.getZoom() + 2 }));
        return this.emit({ type: "clusterTap", lat, lon, count, layer: "places" });
      }
      const hit = map.queryRenderedFeatures(e.point, { layers: ["places"] })[0];
      if (hit) {
        const id = String(hit.properties?.id);
        this.selectPlace(id);
        return this.emit({ type: "placeTap", id });
      }
      if (this.selectedPlace) this.selectPlace(null);
      const p = { lat: e.lngLat.lat, lon: e.lngLat.lng };
      if (player.mode === "sim") {
        if (this.demoTapMode === "teleport") player.teleport(p); else player.walkTo(p);
      }
      this.emit({ type: "mapTap", ...p, action: player.mode === "sim" ? this.demoTapMode : "select" });
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
    document.addEventListener("visibilitychange", () => this.applyRenderActivity());
  }

  private applyRenderActivity() {
    const active = this.renderActive && !document.hidden;
    this.player.setRenderingActive(active);
    this.fogLayer?.setSuspended(!active);
    if (active) this.updateBuildings();
  }

  /** Выполнить команду. Возвращает данные для ответа (если есть). */
  async exec(cmd: Command): Promise<unknown> {
    const { map, fog, player } = this;
    switch (cmd.type) {
      case "setSimSpeed":
        if (player.mode !== "sim") throw new Error("Ускорение доступно только в симуляции. Сначала отключи GPS.");
        player.setSimSpeed(cmd.multiplier);
        this.emit({ type: "demoChanged", speed: player.simSpeed, tapMode: this.demoTapMode });
        return player.simSpeed;
      case "setDemoTapMode":
        if (cmd.mode !== "walk" && cmd.mode !== "teleport") throw new Error("Неизвестный режим нажатия");
        this.demoTapMode = cmd.mode;
        this.emit({ type: "demoChanged", speed: player.simSpeed, tapMode: this.demoTapMode });
        return;
      case "setRenderActivity":
        this.renderActive = cmd.active;
        this.applyRenderActivity();
        return;
      case "setFogEffects":
        this.fogEffects = cmd.enabled;
        save("fog-effects", cmd.enabled);
        this.fogLayer?.setEffects(cmd.enabled);
        return;
      case "setRenderQuality":
        return this.setRenderQuality(cmd.quality);
      case "setViewMode":
        this.viewMode = cmd.mode;
        setViewMode(map, cmd.mode, this.renderProfile);
        this.updateBuildings();
        await this.ensureLandmarkLayer();
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
        this.refreshPlaces();
        return;
      case "showPlayers":
        this.others.clear();
        this.upsertPlayers(cmd.players);
        this.refreshPlayers();
        return this.others.size;
      case "updatePlayers":
        this.upsertPlayers(cmd.players);
        this.refreshPlayers();
        return this.others.size;
      case "removePlayers":
        for (const id of cmd.ids) this.others.delete(id);
        this.refreshPlayers();
        return this.others.size;
      case "setSocialLayer":
        this.social = cmd.mode;
        this.refreshPlayers();
        return;
      case "setLighting":
        this.lighting = cmd.mode;
        return { night: applyLighting(map, cmd.mode) };
      case "setLayers":
        this.layers = normalizeLayers(cmd.layers);
        this.refreshPlaces();
        return this.layers;
      case "selectPlace": {
        if (cmd.placeId && !this.places.has(cmd.placeId)) throw new Error("Место не показано на карте — сначала showPlaces");
        this.selectPlace(cmd.placeId);
        const place = cmd.placeId ? this.places.get(cmd.placeId) : undefined;
        if (place && cmd.fly !== false) { player.follow = false; map.easeTo({ center: [place.lon, place.lat], zoom: Math.max(map.getZoom(), 16) }); }
        return;
      }
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
      case "listQuests": {
        const done = this.progress.state.completedQuests;
        return QUEST_CATALOG.map(({ id, title, giver, intro, reward, start, source, steps, storyId }) => {
          const requires = QUEST_REQUIRES[id] ?? [];
          return { id, title, giver, intro, reward, start, source, storyId, stepCount: steps.length, requires, locked: requires.some((r) => !done[r]), completed: !!done[id] };
        });
      }
      case "startQuestById": {
        const quest = questById(cmd.questId);
        if (!quest) throw new Error(`Квест не найден: ${cmd.questId}`);
        const missing = (QUEST_REQUIRES[quest.id] ?? []).filter((r) => !this.progress.state.completedQuests[r]);
        if (missing.length) throw new Error(`Квест ещё закрыт: сначала ${missing.map((r) => questById(r)?.title ?? r).join(", ")}`);
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
      case "listShop": {
        const st = this.progress.state;
        return shopInfo(st.pity, st.inventory);
      }
      case "gachaPull":
        return this.progress.gachaPull(cmd.bannerId, cmd.count);
      case "buyItem":
        return this.progress.buyItem(cmd.itemId, cmd.currency);
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
  // Метки мест кластеризуются: при отдалении близкие метки собираются в кружок с числом,
  // чтобы на экране не было каши. С зума 16 — отдельные метки.
  map.addSource("places", { type: "geojson", data: EMPTY, cluster: true, clusterRadius: 44, clusterMaxZoom: 15 });
  map.addLayer({
    id: "places-clusters", type: "circle", source: "places", filter: ["has", "point_count"],
    paint: {
      "circle-color": "rgba(15,23,32,0.88)",
      "circle-stroke-color": "#F5B83D", "circle-stroke-width": 2,
      "circle-radius": ["step", ["get", "point_count"], 15, 10, 19, 30, 24],
    },
  });
  map.addLayer({
    id: "places-cluster-count", type: "symbol", source: "places", filter: ["has", "point_count"],
    layout: { "text-field": ["get", "point_count_abbreviated"], "text-font": ["Noto Sans Regular"], "text-size": 13, "text-allow-overlap": true },
    paint: { "text-color": "#F4F6F8" },
  });
  map.addLayer({
    id: "places", type: "circle", source: "places", filter: ["!", ["has", "point_count"]],
    paint: { "circle-radius": 8, "circle-color": ["get", "color"], "circle-stroke-color": "#F4F6F8", "circle-stroke-width": 2 },
  });
  // Другие игроки: значок фиксированного экранного размера, кластеры при отдалении.
  // Кольцо кластера — по самому близкому игроку внутри: группа (янтарь) → друзья (бирюза) → публичные (серый).
  map.addSource("players", {
    type: "geojson", data: EMPTY, cluster: true, clusterRadius: 40, clusterMaxZoom: 16,
    clusterProperties: { party: ["+", ["get", "party"]], friend: ["+", ["get", "friend"]] },
  });
  map.addLayer({
    id: "players-clusters", type: "circle", source: "players", filter: ["has", "point_count"],
    paint: {
      "circle-color": "rgba(15,23,32,0.9)",
      "circle-stroke-color": ["case", [">", ["get", "party"], 0], "#F5B83D", [">", ["get", "friend"], 0], "#3FB8AF", "#9AA6B2"],
      "circle-stroke-width": 2.5,
      "circle-radius": ["step", ["get", "point_count"], 14, 10, 18, 50, 22],
    },
  });
  map.addLayer({
    id: "players-cluster-count", type: "symbol", source: "players", filter: ["has", "point_count"],
    layout: { "text-field": ["get", "point_count_abbreviated"], "text-font": ["Noto Sans Regular"], "text-size": 12, "text-allow-overlap": true },
    paint: { "text-color": "#F4F6F8" },
  });
  map.addLayer({
    id: "players", type: "circle", source: "players", filter: ["!", ["has", "point_count"]],
    layout: { "circle-sort-key": ["get", "priority"] },
    paint: {
      "circle-radius": 11,
      "circle-color": ["get", "color"],
      "circle-stroke-color": ["get", "ring"],
      "circle-stroke-width": ["match", ["get", "relation"], "party", 3, "friend", 2.5, 1.5],
      "circle-opacity": ["match", ["get", "relation"], "public", 0.75, 1],
    },
  });
  map.addLayer({
    id: "players-initial", type: "symbol", source: "players", filter: ["!", ["has", "point_count"]],
    layout: { "text-field": ["get", "initial"], "text-font": ["Noto Sans Regular"], "text-size": 11, "text-allow-overlap": true, "symbol-sort-key": ["get", "priority"] },
    paint: { "text-color": "#0F1720" },
  });

  // Выбранная метка: кольцо и подпись (подписи только по тапу — без шума на карте).
  map.addSource("place-selected", { type: "geojson", data: EMPTY });
  map.addLayer({
    id: "place-selected-ring", type: "circle", source: "place-selected",
    paint: { "circle-radius": 14, "circle-color": "rgba(0,0,0,0)", "circle-stroke-color": ["get", "color"], "circle-stroke-width": 3 },
  });
  map.addLayer({
    id: "place-selected-label", type: "symbol", source: "place-selected",
    layout: { "text-field": ["get", "name"], "text-font": ["Noto Sans Regular"], "text-size": 13, "text-offset": [0, 1.6], "text-anchor": "top", "text-max-width": 12, "text-allow-overlap": true },
    paint: { "text-color": "#F4F6F8", "text-halo-color": "#0F1720", "text-halo-width": 1.6 },
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
