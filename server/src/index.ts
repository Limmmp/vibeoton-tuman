// Точка входа сервера. Настройки — переменные окружения (см. server/.env.example).
import { serve } from "@hono/node-server";
import { join } from "node:path";
import { createApp, loadPlaces } from "./app.ts";
import { openDb } from "./db.ts";

const port = Number(process.env.PORT || 8787);
const dataDir = process.env.DATA_DIR || "./data";
const placesPath = process.env.PLACES_PATH || join(import.meta.dirname, "..", "..", "data", "places.json");

const app = createApp({
  db: openDb(join(dataDir, "tuman.sqlite")),
  places: loadPlaces(placesPath),
  devLogin: process.env.DEV_LOGIN === "1",
  seedDemo: process.env.SEED_DEMO === "1",
});

serve({ fetch: app.fetch, port, hostname: "0.0.0.0" }, (info) => console.log(`Туман API слушает :${info.port}`));
