// Протокол между приложением (React Native) и движком карты в WebView.
// Этот файл и ../quests/types.ts образуют контракт; в RN-проект нужно копировать оба.
//
// RN → карта:   webviewRef.current.postMessage(JSON.stringify(command))
// карта → RN:   onMessage={(e) => handle(JSON.parse(e.nativeEvent.data))}
//
// Команда с полем id получает ответ { type: "result", id, ok, data | error }.

import type { ActiveStep, Quest } from "../quests/types";
import type { AvatarAppearance, AvatarSlot, ProgressEvent, ProgressState } from "../progress/types";
import type { RenderProfile, RenderQuality } from "./performance";
import type { MapLayer } from "./layers";
import type { OtherPlayer, SocialMode } from "./players";
import type { BasemapStatus } from "./basemap-fallback";

export type LatLon = { lat: number; lon: number };

export type Place = {
  id: string;
  lat: number;
  lon: number;
  name?: string;
  kind?: string; // study | leisure | history | event | quest | collect — влияет на цвет метки
};

export type Command =
  | { id?: string; type: "setSimSpeed"; multiplier: number }
  | { id?: string; type: "setDemoTapMode"; mode: "walk" | "teleport" }
  | { id?: string; type: "setRenderActivity"; active: boolean }
  | { id?: string; type: "setFogEffects"; enabled: boolean }
  | { id?: string; type: "setRenderQuality"; quality: RenderQuality }
  | { id?: string; type: "setViewMode"; mode: "2d" | "3d" }
  | { id?: string; type: "set2dTilt"; enabled: boolean }
  | { id?: string; type: "setMapControlsInset"; top: number }
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
  | { id?: string; type: "listQuests" } // ответ: QuestSummary[]
  | { id?: string; type: "startQuestById"; questId: string }
  | { id?: string; type: "startQuest"; quest: Quest }
  | { id?: string; type: "stopQuest" }
  | { id?: string; type: "answerQuiz"; answer: number }
  | { id?: string; type: "completeListen" }
  | { id?: string; type: "confirmLook" }
  | { id?: string; type: "getQuestState" } // ответ: ActiveStep | null
  | { id?: string; type: "getProgress" } // ответ: ProgressState
  | { id?: string; type: "setSelfAvatar"; appearance: AvatarAppearance }
  | { id?: string; type: "listAvatarItems" } // ответ: AvatarItem[]
  | { id?: string; type: "equipAvatarItem"; itemId: string }
  | { id?: string; type: "unequipAvatarSlot"; slot: AvatarSlot }
  | { id?: string; type: "resetProgress" }
  | { id?: string; type: "listShop" } // ответ: баннеры с шансами и гарантией, витрина с ценами
  | { id?: string; type: "gachaPull"; bannerId: string; count: 1 | 10 } // ответ: { results: [{ itemId, rarity, duplicate, shards }], spent, state }
  | { id?: string; type: "buyItem"; itemId: string; currency: "cash" | "shards" } // ответ: ProgressState
  | { id?: string; type: "showPlayers"; players: OtherPlayer[] } // заменить всех других игроков; ответ: их число
  | { id?: string; type: "updatePlayers"; players: OtherPlayer[] } // добавить/обновить по id (новые позиции)
  | { id?: string; type: "removePlayers"; ids: string[] }
  | { id?: string; type: "setSocialLayer"; mode: SocialMode } // off | party | friends | all
  | { id?: string; type: "setLighting"; mode: "auto" | "day" | "night" } // окна и свет домов; auto — по времени Владивостока; ответ: { night }
  | { id?: string; type: "setLayers"; layers: MapLayer[] } // какие категории меток видны; ответ: MapLayer[]
  | { id?: string; type: "selectPlace"; placeId: string | null; fly?: boolean } // подпись у метки (и перелёт к ней); null — снять
  | { id?: string; type: "checkIn"; placeId: string } // ответ: { ok, distance, first?, reward? } — место должно быть в showPlaces, игрок ближе 60 м
  | { id?: string; type: "getDistricts" } // ответ: DistrictStat[]
  | { id?: string; type: "getState" }; // ответ: State

export type State = {
  engineVersion: string;
  basemap: BasemapStatus;
  player: LatLon & { heading: number; mode: "sim" | "external" | "gps"; follow: boolean; simSpeed: number };
  demoTapMode: "walk" | "teleport";
  viewMode: "2d" | "3d";
  tilted2d: boolean;
  fog: { cells: number; km2: number };
  quest: ActiveStep | null;
  progress: ProgressState;
  avatar: AvatarAppearance;
  renderProfile: RenderProfile;
  fogEffects: boolean;
  layers: MapLayer[]; // видимые категории меток
};

export type EngineEvent =
  | { type: "viewChanged"; mode: "2d" | "3d"; tilted2d: boolean }
  | { type: "landmarkTap"; id: string }
  | { type: "demoChanged"; speed: number; tapMode: "walk" | "teleport" }
  | { type: "basemapChanged"; status: BasemapStatus }
  | { type: "mapError"; message: string }
  | { type: "ready"; state: State }
  | { type: "playerMoved"; lat: number; lon: number; heading: number }
  | { type: "routeCleared"; arrived: boolean }
  | { type: "fogChanged"; cells: number; km2: number; fresh: number }
  | { type: "mapTap"; lat: number; lon: number; action: "walk" | "teleport" | "select" }
  | { type: "mapLongPress"; lat: number; lon: number }
  | { type: "placeTap"; id: string }
  | { type: "questTargetTap"; id: string }
  | { type: "activeStep"; active: ActiveStep }
  | { type: "stepDone"; questId: string; stepId: string; stepIndex: number }
  | { type: "questDone"; questId: string; questTitle: string; reward: Quest["reward"]; trusted: boolean }
  | { type: "questFailed"; questId: string; reason: string }
  | { type: "questStopped"; questId: string }
  | { type: "renderQualityChanged"; profile: RenderProfile }
  | { type: "districtProgress"; id: string; name: string; pct: number; revealed: number; total: number } // процент района изменился (целый)
  | { type: "districtMilestone"; id: string; name: string; pct: number } // пройдена веха 25/50/75/90 %, награда придёт в rewardGranted
  | { type: "checkedIn"; placeId: string; first: boolean }
  | { type: "playerTap"; id: string }
  | { type: "clusterTap"; lat: number; lon: number; count: number; layer: "places" | "players" } // тап по кластеру меток; карта сама приближается
  | ProgressEvent
  | { type: "result"; id: string; ok: boolean; data?: unknown; error?: string };

export type { ActiveStep, Quest, QuestSummary } from "../quests/types";
export type { AvatarAppearance, AvatarItem, AvatarSlot, ProgressState, Reward, RewardResult } from "../progress/types";
export type { RenderProfile, RenderQuality } from "./performance";
export type { DistrictStat } from "../progress/districts";
export type { MapLayer } from "./layers";
export type { OtherPlayer, Relation, SocialMode } from "./players";
export type { BasemapStatus } from "./basemap-fallback";
