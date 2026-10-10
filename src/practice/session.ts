export type AttemptOutcome = "clear" | "partial" | "miss" | "recognition_fail";

/** This visit only. Not a lifetime score. */
export type SessionTally = {
  clear: number;
  partial: number;
  unsure: number;
  streak: number;
  started: boolean;
};

const KEY = "echo-session-tally";

export function emptySession(): SessionTally {
  return { clear: 0, partial: 0, unsure: 0, streak: 0, started: false };
}

export function isAttemptOutcome(value: unknown): value is AttemptOutcome {
  return value === "clear" || value === "partial" || value === "miss" || value === "recognition_fail";
}

/**
 * Prefer an outcome the grader already decided (including a future recognition_fail).
 * Otherwise: empty transcript is mic-unsure, a full match is clear, any hit is partial, and only a scored 0 is a miss.
 * This does not change word or 字 matching.
 */
export function classifyAttempt(input: {
  good: number;
  total: number;
  recognitionFailed?: boolean;
  outcome?: unknown;
}): AttemptOutcome {
  if (isAttemptOutcome(input.outcome)) return input.outcome;
  if (input.recognitionFailed) return "recognition_fail";
  if (input.total > 0 && input.good >= input.total) return "clear";
  if (input.good > 0) return "partial";
  return "miss";
}

export function classifyLine(graded: { good: number; total: number }, spoken: string): AttemptOutcome {
  const record = graded as { good: number; total: number; outcome?: unknown };
  return classifyAttempt({
    good: record.good,
    total: record.total,
    recognitionFailed: spoken.trim().length === 0,
    outcome: record.outcome,
  });
}

/**
 * Clear adds a star. Partial holds the streak. A scored miss resets it.
 * Mic unsure never changes clear, partial, or the streak.
 */
export function applyOutcome(tally: SessionTally, outcome: AttemptOutcome): SessionTally {
  const next: SessionTally = { ...tally, started: true };
  if (outcome === "clear") {
    return { ...next, clear: tally.clear + 1, streak: tally.streak + 1 };
  }
  if (outcome === "partial") {
    return { ...next, partial: tally.partial + 1 };
  }
  if (outcome === "miss") {
    return { ...next, streak: 0 };
  }
  return { ...next, unsure: tally.unsure + 1 };
}

function countOf(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n);
}

export function loadSession(storage: Pick<Storage, "getItem"> | null): SessionTally {
  if (!storage) return emptySession();
  try {
    const raw = storage.getItem(KEY);
    if (!raw) return emptySession();
    const o = JSON.parse(raw) as Partial<SessionTally>;
    const clear = countOf(o.clear);
    const partial = countOf(o.partial);
    const unsure = countOf(o.unsure);
    const streak = countOf(o.streak);
    const started = o.started === true || clear + partial + unsure + streak > 0;
    return { clear, partial, unsure, streak, started };
  } catch {
    return emptySession();
  }
}

export function saveSession(storage: Pick<Storage, "setItem"> | null, tally: SessionTally): void {
  if (!storage) return;
  try {
    storage.setItem(KEY, JSON.stringify(tally));
  } catch {
    /* private mode */
  }
}

export function readBrowserSession(): SessionTally {
  try {
    if (typeof sessionStorage === "undefined") return emptySession();
    return loadSession(sessionStorage);
  } catch {
    return emptySession();
  }
}

export function writeBrowserSession(tally: SessionTally): void {
  try {
    if (typeof sessionStorage === "undefined") return;
    saveSession(sessionStorage, tally);
  } catch {
    /* private mode */
  }
}
