import type { Lang } from "./types";

/** Bundled Piper clip for a pack index. `baseUrl` is Vite `BASE_URL` (`/Echo/`). */
export function clipSrc(baseUrl: string, lang: Lang, index: number): string {
  const root = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  const id = String(index).padStart(3, "0");
  return `${root}audio/${lang}/${id}.mp3`;
}
