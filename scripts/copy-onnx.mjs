import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const src = resolve(root, "node_modules/@xenova/transformers/dist");
const dest = resolve(root, "public/onnx");
mkdirSync(dest, { recursive: true });

// Non-threaded builds only. GitHub Pages cannot set COOP/COEP, so the
// runtime stays single-threaded. iOS 16.4 disables SIMD inside Transformers.js.
for (const name of ["ort-wasm.wasm", "ort-wasm-simd.wasm"]) {
  copyFileSync(resolve(src, name), resolve(dest, name));
}
