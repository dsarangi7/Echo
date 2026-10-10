import type { ModelPhase } from "../speech/stt";

const KEY = "echo-whisper-interstitial";

export const INTERSTITIAL_TITLE = "One-time voice model (~44 MB)";
export const INTERSTITIAL_TITLE_ZH = "一次性语音模型（约 44 MB）";
export const INTERSTITIAL_BODY =
  "Prefer Wi-Fi. Say it needs this download. Hear it works now, without the model.";
export const INTERSTITIAL_BODY_ZH = "建议用 Wi-Fi。说一说需要这次下载。听一听现在就能用，不用这个模型。";
export const INTERSTITIAL_SUCCESS = "The voice model is on this device. Hear it never needed it.";
export const INTERSTITIAL_SUCCESS_ZH = "语音模型已经在这台设备上。听一听本来就不需要它。";

export type InterstitialMode = "download" | "success" | "error";

export type InterstitialView = { show: false } | { show: true; mode: InterstitialMode };

type StorageLike = Pick<Storage, "getItem" | "setItem">;

export function loadInterstitialDismissed(storage: StorageLike | null): boolean {
  if (!storage) return false;
  try {
    return storage.getItem(KEY) === "done";
  } catch {
    return false;
  }
}

/** Remember the interstitial only after the model is actually on the device. */
export function dismissInterstitialAfterSuccess(storage: StorageLike | null, phase: ModelPhase): boolean {
  if (!storage || phase !== "ready") return false;
  try {
    storage.setItem(KEY, "done");
    return true;
  } catch {
    return false;
  }
}

/**
 * Show during the first download, then offer "don't show again" once that download finishes.
 * A model that is already ready, with no loading moment this visit, stays hidden.
 * Hear-it-first hides the card without stopping the download.
 */
export function shouldShowDownloadInterstitial(input: {
  dismissed: boolean;
  hearFirst: boolean;
  phase: ModelPhase;
  elapsedMs: number;
  sawPartial: boolean;
  latched: boolean;
  delayMs?: number;
}): InterstitialView {
  if (input.dismissed || input.hearFirst) return { show: false };
  if (input.phase === "error") return { show: true, mode: "error" };
  if (input.phase === "ready") {
    return input.latched ? { show: true, mode: "success" } : { show: false };
  }
  const delay = input.delayMs ?? 400;
  if (input.sawPartial || input.latched || input.elapsedMs >= delay) {
    return { show: true, mode: "download" };
  }
  return { show: false };
}
