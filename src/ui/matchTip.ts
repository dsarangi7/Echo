/** Set after the one-time matching tip has been shown. Stays set across reloads. */
export const MATCH_TIP_KEY = "echo-match-tip";

/** How long the tip stays if the learner does not tap Hear it, Say it, or change cards. */
export const MATCH_TIP_MS = 3200;

type StorageLike = Pick<Storage, "getItem" | "setItem"> | null;

export function readMatchTipSeen(storage: StorageLike): boolean {
  try {
    return storage?.getItem(MATCH_TIP_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeMatchTipSeen(storage: StorageLike): void {
  try {
    storage?.setItem(MATCH_TIP_KEY, "1");
  } catch {
    /* Private mode can reject storage. The in-memory flag still hides it. */
  }
}
