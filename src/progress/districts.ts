// Прогресс по районам: сколько уличных ячеек района открыто и какие вехи (25/50/75/90 %) пройдены.
// Чистая логика без карты: на вход — данные районов и ключи открытых ячеек тумана.

import {
  DISTRICT_MILESTONES, DISTRICT_SIDE, bitIndex, nearestDistrictId, type DistrictData,
} from "../data/districts.ts";
import { cellCenter } from "../engine/geo.ts";

export type DistrictStat = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  revealed: number; // открыто уличных ячеек
  total: number; // всего уличных ячеек
  pct: number; // 0–100, целое
  milestone: number; // последняя достигнутая веха, 0 — ни одной
};

/** Веха пройдена: её награду должен выдать модуль прогресса (ключ district:<id>:<pct>). */
export type MilestoneHit = { districtId: string; name: string; pct: number; reward: { xp: number; cash: number; rep: number; items: string[] } };

type Entry = DistrictData & { buf: Uint8Array; revealed: number };

function decodeBase64(s: string): Uint8Array {
  if (typeof atob === "function") return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
<<<<<<< Updated upstream
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  const clean = s.replace(/\s/g, "").replace(/=+$/, "");
  const out = new Uint8Array(Math.floor((clean.length * 6) / 8));
  let bits = 0, value = 0, at = 0;
  for (const char of clean) {
    const n = alphabet.indexOf(char);
    if (n < 0) throw new Error("districts.json: неверный base64");
    value = (value << 6) | n;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out[at++] = (value >> bits) & 255;
    }
  }
  return out;
=======
  const buffer = (globalThis as typeof globalThis & { Buffer?: { from(value: string, encoding: string): Uint8Array } }).Buffer;
  if (!buffer) throw new Error("Декодирование base64 недоступно");
  return new Uint8Array(buffer.from(s, "base64"));
>>>>>>> Stashed changes
}

export class DistrictTracker {
  private byId = new Map<string, Entry>();

  constructor(data: DistrictData[]) {
    for (const d of data) {
      const buf = decodeBase64(d.bits);
      if (buf.length < Math.ceil((DISTRICT_SIDE * DISTRICT_SIDE) / 8)) throw new Error(`districts.json: битсет района ${d.id} повреждён`);
      this.byId.set(d.id, { ...d, buf, revealed: 0 });
    }
  }

  /** Район уличной ячейки или null, если ячейка не уличная или вне районов. */
  districtOfCell(key: string): Entry | null {
    const i = key.indexOf(":");
    const row = +key.slice(0, i), col = +key.slice(i + 1);
    const id = nearestDistrictId(cellCenter(row, col));
    const d = id ? this.byId.get(id) : undefined;
    if (!d) return null;
    const idx = bitIndex(d, row, col);
    return idx >= 0 && d.buf[idx >> 3] & (1 << (idx & 7)) ? d : null;
  }

  /** Пересчитать с нуля по всем открытым ячейкам (при запуске и после сброса тумана). */
  recount(cells: Iterable<string>) {
    for (const d of this.byId.values()) d.revealed = 0;
    for (const k of cells) {
      const d = this.districtOfCell(k);
      if (d) d.revealed++;
    }
  }

  /** Учесть только что открытые ячейки. Возвращает вехи, пройденные этим шагом. */
  add(keys: Iterable<string>): MilestoneHit[] {
    const before = new Map<string, number>();
    for (const k of keys) {
      const d = this.districtOfCell(k);
      if (!d) continue;
      if (!before.has(d.id)) before.set(d.id, pctOf(d));
      d.revealed++;
    }
    const hits: MilestoneHit[] = [];
    for (const [id, was] of before) {
      const d = this.byId.get(id)!;
      const now = pctOf(d);
      for (const m of DISTRICT_MILESTONES) {
        if (was < m.pct && now >= m.pct) hits.push({ districtId: id, name: d.name, pct: m.pct, reward: { xp: m.xp, cash: m.cash, rep: m.rep, items: [] } });
      }
    }
    return hits;
  }

  /** Все вехи, достигнутые на текущий момент (для догоняющей выдачи после загрузки). */
  reachedMilestones(): MilestoneHit[] {
    const out: MilestoneHit[] = [];
    for (const d of this.byId.values()) {
      const pct = pctOf(d);
      for (const m of DISTRICT_MILESTONES) if (pct >= m.pct) out.push({ districtId: d.id, name: d.name, pct: m.pct, reward: { xp: m.xp, cash: m.cash, rep: m.rep, items: [] } });
    }
    return out;
  }

  stats(): DistrictStat[] {
    return [...this.byId.values()].map((d) => {
      const pct = pctOf(d);
      return {
        id: d.id, name: d.name, lat: d.lat, lon: d.lon,
        revealed: d.revealed, total: d.streetCells, pct: Math.floor(pct),
        milestone: DISTRICT_MILESTONES.filter((m) => pct >= m.pct).at(-1)?.pct ?? 0,
      };
    });
  }
}

const pctOf = (d: Entry) => (d.streetCells ? Math.min(100, (d.revealed / d.streetCells) * 100) : 0);
