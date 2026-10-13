import type { Lang } from "../practice/types";
import intro from "../data/intro.json";

/** Characters (or English) the cat actually speaks. Device-voice fallback uses this. */
export function introLine(lang: Lang): string {
  return lang === "en" ? intro.en : intro.zh;
}

/** Greeting the learner reads. Chinese mode shows the intro's tone-marked pinyin. */
export function introReading(lang: Lang): string {
  if (lang === "en") return intro.en;
  const py = intro.py?.trim();
  return py || intro.zh;
}

export function introClipUrl(lang: Lang, base = import.meta.env.BASE_URL): string {
  const root = base.endsWith("/") ? base : `${base}/`;
  return `${root}audio/intro/${lang}.mp3`;
}
