import type { Lang } from "../practice/types";

/** Hypothesis H1: Say it uses this on-device model, not Web Speech Recognition. */
export const WHISPER_MODEL = "Xenova/whisper-tiny";

/** Quantized encoder (~10 MB) + merged decoder (~30 MB). */
export const WHISPER_WEIGHT_NOTE = "about 40 MB";

export const MODEL_HOSTS = ["https://huggingface.co/", "https://hf-mirror.com/"] as const;

export const DOWNLOAD_LABEL = "Downloading free voice model…";
export const READY_LABEL = "Free voice model is on this device.";

export type FileProgress = { loaded: number; total: number };

export function whisperLanguage(lang: Lang): "english" | "chinese" {
  return lang === "en" ? "english" : "chinese";
}

/** Hypothesis H2: first-load copy stays literal, with a percent when sizes are known. */
export function formatDownloadProgress(files: ReadonlyMap<string, FileProgress>): string {
  let loaded = 0;
  let total = 0;
  for (const file of files.values()) {
    loaded += file.loaded;
    total += file.total > 0 ? file.total : file.loaded;
  }
  if (total <= 0) return DOWNLOAD_LABEL;
  const pct = Math.max(0, Math.min(100, Math.round((loaded / total) * 100)));
  return `${DOWNLOAD_LABEL} ${pct}%`;
}
