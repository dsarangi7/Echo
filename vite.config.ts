import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build as esbuildBuild } from "esbuild";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { defineConfig, type Plugin } from "vite";
import { resolveAppBase } from "./scripts/app-base";

const root = dirname(fileURLToPath(import.meta.url));

/** Bundle the periodic-sync handler next to the Workbox service worker. Dev does not need it. */
function bundleEchoSync(): Plugin {
  return {
    name: "bundle-echo-sync",
    apply: "build",
    async generateBundle() {
      const result = await esbuildBuild({
        absWorkingDir: root,
        entryPoints: [resolve(root, "src/practice/echo-sync-sw.ts")],
        bundle: true,
        format: "iife",
        platform: "browser",
        target: "es2022",
        write: false,
        legalComments: "none",
        logLevel: "silent",
      });
      const source = result.outputFiles[0]?.text;
      if (!source) throw new Error("echo-sync bundle was empty");
      this.emitFile({ type: "asset", fileName: "echo-sync.js", source });
    },
  };
}

const shim = (name: string) => fileURLToPath(new URL(`./src/speech/shims/${name}.ts`, import.meta.url));

// /Echo/ on GitHub Pages. / on Vercel and in the Capacitor Android shell.
const base = resolveAppBase();
const capacitorBuild = Boolean(process.env.CAPACITOR || process.env.VITE_CAPACITOR);

export default defineConfig(({ command }) => ({
  plugins: [
    react(),
    // A service worker fights the Capacitor WebView (stale shell, broken navigation).
    ...(capacitorBuild
      ? []
      : [
          bundleEchoSync(),
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
              // Production only. The bundled handler is emitted as dist/echo-sync.js.
              // A dev service worker must not import a file the dev server does not have.
              importScripts: command === "build" ? ["echo-sync.js"] : [],
            },
          }),
        ]),
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
}));
