import { useSyncExternalStore } from "react";

/** Small per-device display and feedback choices. Stored in this browser / WebView only. */
export type Prefs = {
  /** Color pinyin syllables by tone (1 red, 2 amber, 3 jade, 4 indigo). */
  toneColors: boolean;
  /** Stamp thud, paper flip, and vibration. */
  feedback: boolean;
};

export const PREFS_STORAGE_KEY = "echo-prefs";
const DEFAULTS: Prefs = { toneColors: true, feedback: true };

function storage(): Storage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

export function parsePrefs(raw: string | null): Prefs {
  if (!raw) return DEFAULTS;
  try {
    const value = JSON.parse(raw) as Partial<Prefs>;
    return {
      toneColors: typeof value.toneColors === "boolean" ? value.toneColors : DEFAULTS.toneColors,
      feedback: typeof value.feedback === "boolean" ? value.feedback : DEFAULTS.feedback,
    };
  } catch {
    return DEFAULTS;
  }
}

let current: Prefs = (() => {
  try {
    return parsePrefs(storage()?.getItem(PREFS_STORAGE_KEY) ?? null);
  } catch {
    return DEFAULTS;
  }
})();
const listeners = new Set<() => void>();

function reflect(prefs: Prefs) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.tones = prefs.toneColors ? "on" : "off";
}
reflect(current);

export function readPrefs(): Prefs {
  return current;
}

export function setPrefs(patch: Partial<Prefs>): void {
  current = { ...current, ...patch };
  try {
    storage()?.setItem(PREFS_STORAGE_KEY, JSON.stringify(current));
  } catch {
    /* private mode */
  }
  reflect(current);
  listeners.forEach((fn) => fn());
}

export function usePrefs(): Prefs {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    () => current,
    () => DEFAULTS,
  );
}
