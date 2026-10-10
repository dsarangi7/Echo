import type { Lang } from "../practice/types";
import intro from "../data/intro.json";

export function introLine(lang: Lang): string {
  return lang === "en" ? intro.en : intro.zh;
}

export function introClipUrl(lang: Lang, base = import.meta.env.BASE_URL): string {
  const root = base.endsWith("/") ? base : `${base}/`;
  return `${root}audio/intro/${lang}.mp3`;
}
