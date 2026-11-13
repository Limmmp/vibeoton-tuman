// Другие игроки на карте (группа, друзья, публичные). Карта их только рисует:
// кто кого видит, огрубление координат публичных игроков и сеть — на стороне приложения и сервера
// (диз-док, раздел 8.5). Свой аватар — отдельный маркер (player.ts), всегда поверх.
//
// Чтобы много игроков не превращались в кашу: фиксированный экранный размер значка,
// кластеры при отдалении (кольцо кластера окрашено по самому «близкому» игроку внутри),
// приоритет отрисовки группа → друзья → публичные, подпись — только по тапу.

export type Relation = "party" | "friend" | "public";
export type SocialMode = "off" | "party" | "friends" | "all";

export type OtherPlayer = {
  id: string;
  lat: number;
  lon: number;
  name?: string;
  relation: Relation;
  color?: string; // цвет аватара (bodyColor), по умолчанию — по отношению
  heading?: number;
};

export const RELATION_COLOR: Record<Relation, string> = { party: "#F5B83D", friend: "#3FB8AF", public: "#9AA6B2" };
const PRIORITY: Record<Relation, number> = { party: 3, friend: 2, public: 1 };

/** Кто виден в режиме социального слоя. */
export function visiblePlayers(players: Iterable<OtherPlayer>, mode: SocialMode): OtherPlayer[] {
  const allow: Record<SocialMode, Relation[]> = { off: [], party: ["party"], friends: ["party", "friend"], all: ["party", "friend", "public"] };
  const ok = new Set(allow[mode]);
  return [...players].filter((p) => ok.has(p.relation));
}

export function validatePlayer(p: OtherPlayer): string | null {
  if (!p || typeof p.id !== "string" || !p.id) return "нет id";
  if (!Number.isFinite(p.lat) || !Number.isFinite(p.lon)) return `${p.id}: нет координат`;
  if (!(p.relation in PRIORITY)) return `${p.id}: неизвестное отношение ${String(p.relation)}`;
  return null;
}

export function playersGeoJSON(players: OtherPlayer[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: players.map((p) => ({
      type: "Feature",
      properties: {
        id: p.id,
        name: p.name ?? "",
        initial: (p.name ?? "?").trim().charAt(0).toUpperCase() || "?",
        relation: p.relation,
        priority: PRIORITY[p.relation],
        party: p.relation === "party" ? 1 : 0,
        friend: p.relation === "friend" ? 1 : 0,
        color: p.color ?? RELATION_COLOR[p.relation],
        ring: RELATION_COLOR[p.relation],
      },
      geometry: { type: "Point", coordinates: [p.lon, p.lat] },
    })),
  };
}
