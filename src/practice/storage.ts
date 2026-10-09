import type { Indexes, Lang } from "./types";

const LS_LANG = "echo-practice-lang";
const LS_IDX = "echo-practice-index";

export function loadLang(): Lang {
  try {
    const v = localStorage.getItem(LS_LANG);
    return v === "en" || v === "zh" ? v : "en";
  } catch {
    return "en";
  }
}

export function saveLang(lang: Lang) {
  try {
    localStorage.setItem(LS_LANG, lang);
  } catch {
    /* private mode */
  }
}

export function loadIndexes(): Indexes {
  try {
    const raw = localStorage.getItem(LS_IDX);
    if (!raw) return { en: 0, zh: 0 };
    const o = JSON.parse(raw) as { en?: unknown; zh?: unknown };
    return {
      en: clampIndex(o.en),
      zh: clampIndex(o.zh),
    };
  } catch {
    return { en: 0, zh: 0 };
  }
}

export function saveIndexes(indexes: Indexes) {
  try {
    localStorage.setItem(LS_IDX, JSON.stringify(indexes));
  } catch {
    /* private mode */
  }
}

function clampIndex(value: unknown): number {
  const n = Number(value) || 0;
  return Math.max(0, Math.min(99, n));
}
