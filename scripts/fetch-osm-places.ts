// Скачать кандидатов в каталог мест из OpenStreetMap (Overpass API).
// Результат — data/raw/osm-places.json (сырые объекты OSM). Дальше: npm run data:build.
// Запуск: npm run data:fetch

import { writeFile, mkdir } from "node:fs/promises";
import { CITY_BBOX } from "../src/data/place.ts";

const OVERPASS = "https://overpass-api.de/api/interpreter";
const b = `${CITY_BBOX.s},${CITY_BBOX.w},${CITY_BBOX.n},${CITY_BBOX.e}`;

// Что ищем: места для учёбы и работы, творчества, бесплатного и недорогого досуга.
const query = `
[out:json][timeout:90];
(
  nwr["amenity"="library"](${b});
  nwr["amenity"="coworking_space"](${b});
  nwr["office"="coworking"](${b});
  nwr["amenity"="cafe"]["internet_access"~"wlan|yes"](${b});
  nwr["amenity"="cafe"]["name"~"[Аа]нтикафе"](${b});
  nwr["amenity"="arts_centre"](${b});
  nwr["amenity"="community_centre"]["name"](${b});
  nwr["tourism"="museum"](${b});
  nwr["tourism"="gallery"](${b});
  nwr["tourism"="viewpoint"](${b});
  nwr["amenity"="cinema"](${b});
  nwr["amenity"="theatre"](${b});
  nwr["leisure"="park"]["name"](${b});
  nwr["shop"="games"](${b});
  nwr["leisure"="escape_game"](${b});
);
out center tags;
`;

const res = await fetch(OVERPASS, {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "tuman-vladivostok-hackathon/0.1" },
  body: "data=" + encodeURIComponent(query),
});
if (!res.ok) throw new Error(`Overpass ответил ${res.status}: ${(await res.text()).slice(0, 300)}`);
const json = (await res.json()) as { elements: unknown[] };

await mkdir("data/raw", { recursive: true });
await writeFile("data/raw/osm-places.json", JSON.stringify({ fetchedAt: new Date().toISOString(), elements: json.elements }, null, 1));
console.log(`Сохранено объектов OSM: ${json.elements.length} → data/raw/osm-places.json`);
