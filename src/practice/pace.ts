import type { Lang } from "./types";

/** Hear it speed. Applied with `HTMLMediaElement.playbackRate` (pitch stays put). */
export type HearPace = "slow" | "normal" | "fast";

export const HEAR_PACES: readonly HearPace[] = ["slow", "normal", "fast"];

/**
 * 1 is the Piper clip as generated.
 * Slow is 0.75 (25% lower rate, about 33% longer) so 中文 is easier to shadow.
 * Fast is 1.25. English Normal stays at 1.
 */
export const HEAR_PACE_RATE: Record<HearPace, number> = {
  slow: 0.75,
  normal: 1,
  fast: 1.25,
};

export const HEAR_PACE_LABEL: Record<HearPace, { en: string; zh: string }> = {
  slow: { en: "Slow", zh: "慢" },
  normal: { en: "Normal", zh: "正常" },
  fast: { en: "Fast", zh: "快" },
};

export type HearPaces = Record<Lang, HearPace>;

/** English stays at the file speed. Chinese starts slower so a first visit can shadow. */
export function defaultHearPaces(): HearPaces {
  return { en: "normal", zh: "slow" };
}

export function hearPaceRate(pace: HearPace): number {
  return HEAR_PACE_RATE[pace];
}

export function parseHearPace(value: unknown, fallback: HearPace): HearPace {
  return value === "slow" || value === "normal" || value === "fast" ? value : fallback;
}

export function parseHearPaces(raw: unknown): HearPaces {
  const defaults = defaultHearPaces();
  if (!raw || typeof raw !== "object") return defaults;
  const saved = raw as { en?: unknown; zh?: unknown };
  return {
    en: parseHearPace(saved.en, defaults.en),
    zh: parseHearPace(saved.zh, defaults.zh),
  };
}
