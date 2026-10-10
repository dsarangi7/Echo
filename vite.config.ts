import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { fileURLToPath } from "node:url";
import { resolveAppBase } from "./scripts/app-base";

const shim = (name: string) => fileURLToPath(new URL(`./src/speech/shims/${name}.ts`, import.meta.url));

// /Echo/ on GitHub Pages. / when VERCEL is set, or when VITE_BASE / BASE_PATH says so.
const base = resolveAppBase();

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png"],
      manifest: {
        name: "课猫 Echo",
        short_name: "课猫 Echo",
        description: "Practice English or Chinese out loud. Hear it and Say it run on this device.",
        theme_color: "#121212",
        background_color: "#121212",
        display: "standalone",
        start_url: base,
        scope: base,
        lang: "en",
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        // The Whisper onnx files are ~10 MB and ~29 MB. Leave them out of the
        // precache (the cap is 12 MB). Say it fetches them from this origin and
        // Transformers.js stores them in the Cache API.
        globPatterns: ["**/*.{js,css,html,svg,png,webmanifest,mp3,wasm}"],
        globIgnores: ["**/models/**"],
        navigateFallback: "index.html",
        maximumFileSizeToCacheInBytes: 12 * 1024 * 1024,
      },
    }),
  ],
  // Project site: https://dsarangi7.github.io/Echo/ — Vercel uses /.
  base,
  optimizeDeps: {
    exclude: ["@xenova/transformers"],
  },
  resolve: {
    alias: {
      "onnxruntime-node": shim("onnx-node"),
      sharp: shim("sharp"),
    },
  },
  worker: {
    format: "es",
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
  },
});
