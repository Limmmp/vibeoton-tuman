import { lanPlugin } from "./scripts/lan-plugin";
import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

// base: "./" — чтобы сборка открывалась с GitHub Pages из подпапки репозитория.
export default defineConfig({
  base: "./",
  plugins: [lanPlugin()],
  server: { host: true },
  build: { rollupOptions: { input: { map: fileURLToPath(new URL("./index.html", import.meta.url)), collection: fileURLToPath(new URL("./collection.html", import.meta.url)) } } },
});
