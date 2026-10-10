import type { Lang } from "../practice/types";

/** Hypothesis H1: Say it uses this on-device model, not Web Speech Recognition. */
export const WHISPER_MODEL = "Xenova/whisper-tiny";

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

export function whisperAssetUrl(origin: string, base: string, file: string): string {
  const root = localModelPath(origin, base);
  const prefix = root.endsWith("/") ? root : `${root}/`;
  return `${prefix}${WHISPER_MODEL}/${file}`;
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
