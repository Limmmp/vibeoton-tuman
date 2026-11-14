// Районы Владивостока: центры, вехи наград и формат «уличных» ячеек.
// Процент района = открытые уличные ячейки / все уличные ячейки района.
// Уличные ячейки (пешеходные дороги из OSM, растеризованные в сетку тумана) собирает
// scripts/build-districts.ts в data/districts.json — компактными битсетами по строкам.
// Только «стираемый» TypeScript — файл запускается и в Node, и в Vite.

import { cellOf, cellRowHeightDeg, distance, type LatLon } from "../engine/geo.ts";

// Центры — по остановкам/главным улицам микрорайонов, точность ±300 м (из прежней версии «Тумана»).
export const DISTRICT_CENTERS = [
  { id: "center", name: "Центр", lat: 43.1165, lon: 131.886 },
  { id: "eagle", name: "Орлиная сопка", lat: 43.1225, lon: 131.895 },
  { id: "egersheld", name: "Эгершельд", lat: 43.0952, lon: 131.8647 },
  { id: "churkin", name: "Чуркин", lat: 43.096, lon: 131.91 },
  { id: "zmeinka", name: "Змеинка", lat: 43.0859, lon: 131.8939 },
  { id: "dalzavod", name: "Дальзавод", lat: 43.113, lon: 131.912 },
  { id: "rechka1", name: "Первая Речка", lat: 43.1371, lon: 131.9027 },
  { id: "morgorodok", name: "Моргородок", lat: 43.1477, lon: 131.9045 },
  { id: "rechka2", name: "Вторая Речка", lat: 43.164, lon: 131.908 },
  { id: "zarya", name: "Заря", lat: 43.1802, lon: 131.9205 },
  { id: "chaika", name: "Чайка", lat: 43.196, lon: 131.921 },
  { id: "sedanka", name: "Седанка", lat: 43.2132, lon: 131.9567 },
  { id: "okeanskaya", name: "Океанская", lat: 43.2352, lon: 132.0071 },
  { id: "sadgorod", name: "Садгород", lat: 43.2627, lon: 132.0407 },
  { id: "snegovaya", name: "Снеговая Падь", lat: 43.1633, lon: 131.9569 },
  { id: "balyaeva", name: "Баляева", lat: 43.128, lon: 131.942 },
  { id: "lugovaya", name: "Луговая", lat: 43.111, lon: 131.938 },
  { id: "zeleny", name: "Зелёный Угол", lat: 43.119, lon: 131.965 },
  { id: "neybuta", name: "Нейбута", lat: 43.104, lon: 131.9603 },
  { id: "borisenko", name: "Борисенко", lat: 43.0977, lon: 131.9543 },
  { id: "tikhaya", name: "Тихая", lat: 43.093, lon: 131.97 },
  { id: "patrokl", name: "Патрокл", lat: 43.078, lon: 131.962 },
  { id: "shitovaya", name: "Щитовая", lat: 43.1268, lon: 132.0149 },
  { id: "rybachy", name: "Рыбачий", lat: 43.1347, lon: 132.0378 },
  { id: "ajax", name: "Аякс (ДВФУ)", lat: 43.0281, lon: 131.8941 },
  { id: "melkovodny", name: "Мелководный", lat: 43.017, lon: 131.8877 },
  { id: "paris", name: "Парис", lat: 43.0115, lon: 131.8967 },
  { id: "ekipazhny", name: "Экипажный", lat: 43.0106, lon: 131.8705 },
  { id: "minka", name: "Минка", lat: 43.03, lon: 131.8734 },
  { id: "shigino", name: "Шигино", lat: 43.0351, lon: 131.8531 },
  { id: "ket", name: "КЭТ", lat: 43.0265, lon: 131.8594 },
  { id: "kanal", name: "Канал", lat: 43.0576, lon: 131.8501 },
  { id: "pospelovo", name: "Поспелово", lat: 43.0581, lon: 131.8835 },
  { id: "podnozhye", name: "Подножье", lat: 43.0448, lon: 131.8227 },
  { id: "rynda", name: "Рында", lat: 43.0323, lon: 131.8049 },
  { id: "zhitkova", name: "Житкова", lat: 43.0232, lon: 131.9283 },
] as const;

/** Дальше этого от любого центра — «окраина» без района. */
export const DISTRICT_MAX_R = 1800;
/** Полуразмер окна битсета в ячейках (окно покрывает круг DISTRICT_MAX_R). */
export const DISTRICT_HALF = 92;

export const DISTRICT_MILESTONES = [
  { pct: 25, xp: 100, cash: 50 },
  { pct: 50, xp: 250, cash: 150 },
  { pct: 75, xp: 500, cash: 300 },
  { pct: 90, xp: 1000, cash: 600 },
] as const;

/** Запись data/districts.json. */
export type DistrictData = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  streetCells: number; // всего уличных ячеек
  row0: number; // первая строка окна
  colStarts: number[]; // первый столбец окна для каждой строки (ширина столбца зависит от широты)
  bits: string; // base64: (2·HALF+1) строк × (2·HALF+1) бит, по строкам
};

export const DISTRICT_SIDE = DISTRICT_HALF * 2 + 1;

/** Ближайший район в пределах DISTRICT_MAX_R (по центрам). */
export function nearestDistrictId(p: LatLon): string | null {
  let best: string | null = null, bestD = DISTRICT_MAX_R;
  for (const d of DISTRICT_CENTERS) {
    const dd = distance(p, d);
    if (dd <= bestD) { bestD = dd; best = d.id; }
  }
  return best;
}

/** Окно битсета района: первая строка и первый столбец каждой строки. */
export function districtWindow(center: LatLon): { row0: number; colStarts: number[] } {
  const c = cellOf(center);
  const row0 = c.row - DISTRICT_HALF;
  const colStarts: number[] = [];
  for (let i = 0; i < DISTRICT_SIDE; i++) {
    const lat = (row0 + i + 0.5) * cellRowHeightDeg();
    colStarts.push(cellOf({ lat, lon: center.lon }).col - DISTRICT_HALF);
  }
  return { row0, colStarts };
}

export function bitIndex(d: Pick<DistrictData, "row0" | "colStarts">, row: number, col: number): number {
  const r = row - d.row0;
  if (r < 0 || r >= DISTRICT_SIDE) return -1;
  const c = col - d.colStarts[r];
  if (c < 0 || c >= DISTRICT_SIDE) return -1;
  return r * DISTRICT_SIDE + c;
}
