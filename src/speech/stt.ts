import type { Lang } from "../practice/types";
import {
  DOWNLOAD_LABEL,
  MODEL_HOSTS,
  READY_LABEL,
  formatDownloadProgress,
  whisperLanguage,
  type FileProgress,
} from "./model";

type ProgressMsg = {
  type: "progress";
  status: string;
  file: string;
  loaded?: number;
  total?: number;
  progress?: number;
};

type OutMsg =
  | ProgressMsg
  | { type: "ready" }
  | { type: "result"; id: number; text: string }
  | { type: "error"; id?: number; message: string };

const listeners = new Set<(note: string) => void>();
let note = DOWNLOAD_LABEL;
let worker: Worker | null = null;
let ready: Promise<void> | null = null;
let seq = 0;
const pending = new Map<number, { resolve: (text: string) => void; reject: (err: Error) => void }>();

function publish(next: string) {
  note = next;
  listeners.forEach((listener) => listener(next));
}

export function subscribeModel(listener: (next: string) => void): () => void {
  listeners.add(listener);
  listener(note);
  return () => listeners.delete(listener);
}

export function modelNote(): string {
  return note;
}

function spawn(host: string): Promise<void> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const fail = (err: Error) => {
      if (settled) return;
      settled = true;
      reject(err);
    };
    const ok = () => {
      if (settled) return;
      settled = true;
      resolve();
    };

    const next = new Worker(new URL("./whisper.worker.ts", import.meta.url), { type: "module" });
    worker = next;
    const files = new Map<string, FileProgress>();

    next.onmessage = (event: MessageEvent<OutMsg>) => {
      const msg = event.data;
      if (msg.type === "progress") {
        if (!settled && msg.file && typeof msg.loaded === "number" && typeof msg.total === "number" && msg.total > 0) {
          files.set(msg.file, { loaded: msg.loaded, total: msg.total });
          publish(formatDownloadProgress(files));
        } else if (!settled && (msg.status === "download" || msg.status === "initiate" || msg.status === "progress")) {
          publish(files.size ? formatDownloadProgress(files) : DOWNLOAD_LABEL);
        }
        return;
      }
      if (msg.type === "ready") {
        publish(READY_LABEL);
        ok();
        return;
      }
      if (msg.type === "result") {
        pending.get(msg.id)?.resolve(msg.text);
        pending.delete(msg.id);
        return;
      }
      if (msg.type === "error") {
        const err = new Error(msg.message || "Voice model failed");
        if (msg.id == null) fail(err);
        else {
          pending.get(msg.id)?.reject(err);
          pending.delete(msg.id);
        }
      }
    };
    next.onerror = () => fail(new Error("The on-device voice model could not start."));
    next.postMessage({ type: "load", host });
  });
}

async function loadWithFallback(): Promise<void> {
  if (typeof WebAssembly !== "object" || typeof Worker === "undefined") {
    publish("This browser cannot run the on-device voice model. 这个浏览器跑不了本地语音模型。");
    throw new Error("WebAssembly or Worker missing");
  }
  publish(DOWNLOAD_LABEL);
  let last: unknown;
  for (const host of MODEL_HOSTS) {
    try {
      await spawn(host);
      return;
    } catch (err) {
      last = err;
      worker?.terminate();
      worker = null;
    }
  }
  publish(
    "Could not download the free voice model. Connect once, then it stays on this device. 免费语音模型没下完。连一次网，之后就留在这台设备上。",
  );
  throw last instanceof Error ? last : new Error("Voice model download failed");
}

/** Hypothesis H2: one shared load, cached by Transformers.js in the Cache API. */
export function ensureModel(): Promise<void> {
  if (!ready) {
    const attempt = loadWithFallback().catch((err: unknown) => {
      if (ready === attempt) ready = null;
      throw err;
    });
    ready = attempt;
  }
  return ready;
}

export function transcribe(audio: Float32Array, lang: Lang): Promise<string> {
  return ensureModel().then(
    () =>
      new Promise((resolve, reject) => {
        if (!worker) {
          reject(new Error("Voice model is not ready."));
          return;
        }
        const id = ++seq;
        const timer = window.setTimeout(() => {
          pending.delete(id);
          reject(new Error("Transcription took too long."));
        }, 90000);
        pending.set(id, {
          resolve: (text) => {
            window.clearTimeout(timer);
            resolve(text);
          },
          reject: (err) => {
            window.clearTimeout(timer);
            reject(err);
          },
        });
        const copy = new Float32Array(audio);
        worker.postMessage({ type: "transcribe", id, audio: copy, language: whisperLanguage(lang) }, [copy.buffer]);
      }),
  );
}
