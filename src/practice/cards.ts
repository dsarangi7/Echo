/** Soft paper tones. Consecutive cards differ; ink stays dark enough to read. */
export type CardTone = {
  id: string;
  bg: string;
  ink: string;
  soft: string;
};

export const CARD_TONES: readonly CardTone[] = [
  { id: "wheat", bg: "#F6E7C1", ink: "#2A2414", soft: "#5C4C30" },
  { id: "sage", bg: "#C9DCCE", ink: "#163028", soft: "#2C4A3A" },
  { id: "mist", bg: "#C9D7EA", ink: "#1A2740", soft: "#2E4460" },
  { id: "clay", bg: "#F0CABB", ink: "#3A2218", soft: "#6A3A2C" },
  { id: "olive", bg: "#DDE3B8", ink: "#2A3014", soft: "#3E4A28" },
  { id: "stone", bg: "#D5DBE3", ink: "#1C2430", soft: "#3A4454" },
  { id: "apricot", bg: "#F8D7B0", ink: "#3A2810", soft: "#6A4818" },
  { id: "blush", bg: "#F3D4D0", ink: "#3A2222", soft: "#6A3838" },
];

export function cardTone(index: number): CardTone {
  const n = CARD_TONES.length;
  const i = ((index % n) + n) % n;
  return CARD_TONES[i];
}

/** Next index inside the current set, wrapping at the set edges. */
export function stepWithinSet(pack: readonly { set: string }[], index: number, delta: number): number {
  const n = pack.length;
  if (n === 0) return 0;
  const at = ((index % n) + n) % n;
  const name = pack[at].set;
  let start = at;
  while (start > 0 && pack[start - 1].set === name) start -= 1;
  let end = at + 1;
  while (end < n && pack[end].set === name) end += 1;
  const count = end - start;
  const pos = at - start;
  const shift = ((delta % count) + count) % count;
  return start + ((pos + shift) % count);
}

/** Which way a move inside one set should travel. Pack changes enter from the right. */
export function directionWithin(setStart: number, setCount: number, from: number, to: number): -1 | 1 {
  if (setCount <= 1 || from === to) return 1;
  if (from < setStart || from >= setStart + setCount || to < setStart || to >= setStart + setCount) return 1;
  const a = from - setStart;
  const b = to - setStart;
  const forward = (b - a + setCount) % setCount;
  const back = (a - b + setCount) % setCount;
  return forward <= back ? 1 : -1;
}

/**
 * Horizontal swipe commits to the next card (1) or the previous (-1).
 * A mostly vertical drag is a scroll, not a card change.
 */
export function swipeDecision(dx: number, dy: number, width: number): -1 | 1 | 0 {
  if (!Number.isFinite(dx) || !Number.isFinite(dy)) return 0;
  if (Math.abs(dx) < 12) return 0;
  if (Math.abs(dy) > Math.abs(dx) * 0.85) return 0;
  const span = Number.isFinite(width) && width > 0 ? width : 320;
  const threshold = Math.min(88, Math.max(56, span * 0.18));
  if (dx <= -threshold) return 1;
  if (dx >= threshold) return -1;
  return 0;
}

export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function"
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
    : false;
}
