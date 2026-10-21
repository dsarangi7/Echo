import type { EchoMode } from "../components/ModeNav";

/** Set after the cat landing is dismissed. Stays set across reloads. */
export const LANDING_DISMISSED_KEY = "echo-landing-dismissed";

/** Practice, Translate, or Word decks, so a later visit opens where they left off. */
export const APP_MODE_KEY = "echo-app-mode";

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem"> | null;

export function readLandingDismissed(storage: StorageLike): boolean {
  try {
    return storage?.getItem(LANDING_DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeLandingDismissed(storage: StorageLike): void {
  try {
    storage?.setItem(LANDING_DISMISSED_KEY, "1");
  } catch {
    /* Private mode can reject storage. The in-memory flag still hides it. */
  }
}

export function clearLandingDismissed(storage: StorageLike): void {
  try {
    storage?.removeItem(LANDING_DISMISSED_KEY);
  } catch {
    /* Ignore. */
  }
}

export function readAppMode(storage: StorageLike): EchoMode {
  try {
    const value = storage?.getItem(APP_MODE_KEY);
    if (value === "translate" || value === "words") return value;
    return "practice";
  } catch {
    return "practice";
  }
}

export function writeAppMode(storage: StorageLike, mode: EchoMode): void {
  try {
    storage?.setItem(APP_MODE_KEY, mode);
  } catch {
    /* Ignore. */
  }
}
