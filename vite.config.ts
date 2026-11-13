import { defineConfig } from "vite";

// base: "./" — чтобы сборка открывалась с GitHub Pages из подпапки репозитория.
export default defineConfig({
  base: "./",
  server: { host: true },
});
