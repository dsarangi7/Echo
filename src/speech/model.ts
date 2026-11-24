import type { Lang } from "../practice/types";

/** Hypothesis H1: Say it uses this on-device model, not Web Speech Recognition. The website ships only this one. */
export const WHISPER_MODEL = "Xenova/whisper-tiny";

/**
 * Whisper base: about 2 points better on our Chinese and English clips, and about 1.5x slower.
 * Only the Android app bundles it (~77 MB), so it never becomes a website download.
 */
export const WHISPER_ACCURATE_MODEL = "Xenova/whisper-base";

export type VoiceModelChoice = "fast" | "accurate";

export const VOICE_MODEL_STORAGE_KEY = "echo-voice-model";

/** True in the Capacitor build, which copies whisper-base into the app. */
export function accurateModelBundled(): boolean {
  try {
    return import.meta.env.VITE_ECHO_ACCURATE === "1";
  } catch {
    return false;
  }
}

export function voiceModelId(choice: VoiceModelChoice, bundled = accurateModelBundled()): string {
  return choice === "accurate" && bundled ? WHISPER_ACCURATE_MODEL : WHISPER_MODEL;
}

/** Saved choice. The app defaults to Accurate because it ships the weights; the website is always Fast. */
export function readVoiceModel(storage: Pick<Storage, "getItem"> | null, bundled = accurateModelBundled()): VoiceModelChoice {
  if (!bundled) return "fast";
  try {
    return storage?.getItem(VOICE_MODEL_STORAGE_KEY) === "fast" ? "fast" : "accurate";
  } catch {
    return "accurate";
  }
}

export function saveVoiceModel(storage: Pick<Storage, "setItem"> | null, choice: VoiceModelChoice): void {
  try {
    storage?.setItem(VOICE_MODEL_STORAGE_KEY, choice);
  } catch {
    /* private mode */
  }
}

/** Quantized encoder (~10 MB) + merged decoder (~29 MB) + tokenizer (~2.8 MB), vendored with the site. */
export const WHISPER_WEIGHT_NOTE = "about 44 MB";

/** Files Transformers.js reads for quantized Whisper tiny. Served from `public/models`. */
export const VENDORED_WHISPER_FILES = [
  "config.json",
  "generation_config.json",
  "preprocessor_config.json",
  "tokenizer.json",
  "tokenizer_config.json",
  "onnx/encoder_model_quantized.onnx",
  "onnx/decoder_model_merged_quantized.onnx",
] as const;

export const DOWNLOAD_LABEL = "Wait a moment — downloading the voice model… 请稍等，正在下载语音模型…";
export const READY_LABEL =
  "Hear it is ready. Say it voice model is on this device. 听一听可以直接用。说一说的语音模型已经在这台设备上。";
export const MODEL_LOAD_ERROR =
  "Could not load the Say it voice model from this site. Hear it still plays. Refresh and try Say it again. 说一说的语音模型没从本站载入。听一听还能用。刷新后再试说一说。";
export const MODEL_UNSUPPORTED =
  "This browser cannot run the on-device voice model. Hear it still plays. 这个浏览器跑不了本地语音模型。听一听还能用。";

export type FileProgress = { loaded: number; total: number };

export type LocalTransformerEnv = {
  allowLocalModels: boolean;
  allowRemoteModels: boolean;
  useBrowserCache: boolean;
  useFS: boolean;
  useFSCache: boolean;
  localModelPath: string;
};

/** Directory Transformers.js joins with `Xenova/whisper-tiny/<file>`. Absolute so the worker does not resolve against its script URL. */
export function localModelPath(origin: string, base: string): string {
  const root = base.endsWith("/") ? base : `${base}/`;
  return new URL(`${root}models/`, origin).href;
}

export function whisperAssetUrl(origin: string, base: string, file: string, model = WHISPER_MODEL): string {
  const root = localModelPath(origin, base);
  const prefix = root.endsWith("/") ? root : `${root}/`;
  return `${prefix}${model}/${file}`;
}

/**
 * Same-origin weights only. `useBrowserCache` stores them in the Cache API (`transformers-cache`)
 * after the first visit, so later visits do not download again.
 */
export function configureLocalWhisper(target: LocalTransformerEnv, origin: string, base: string): void {
  target.allowLocalModels = true;
  target.allowRemoteModels = false;
  target.useBrowserCache = true;
  target.useFS = false;
  target.useFSCache = false;
  target.localModelPath = localModelPath(origin, base);
}

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

export type DownloadTotals = {
  loaded: number;
  total: number;
  /** 0–100 when at least one file reported a size. Otherwise null. */
  pct: number | null;
};

/** Bytes received versus known file sizes. Unknown totals stay out of the meter. */
export function downloadTotals(files: ReadonlyMap<string, FileProgress>): DownloadTotals {
  let loaded = 0;
  let total = 0;
  for (const file of files.values()) {
    loaded += file.loaded;
    if (file.total > 0) total += file.total;
  }
  if (total <= 0) return { loaded, total: 0, pct: null };
  const pct = Math.max(0, Math.min(100, Math.round((loaded / total) * 100)));
  return { loaded, total, pct };
}

/** Approx megabytes for the download meter, e.g. "21.4 MB". */
export function formatMegabytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0.0 MB";
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Percent plus approximate megabytes. Null until a file size is known. */
export function formatDownloadMeter(files: ReadonlyMap<string, FileProgress>): string | null {
  const snap = downloadTotals(files);
  if (snap.pct == null) return null;
  return `${snap.pct}% · ${formatMegabytes(snap.loaded)} / ${formatMegabytes(snap.total)}`;
}
