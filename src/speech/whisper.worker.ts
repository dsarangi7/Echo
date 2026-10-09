/// <reference lib="webworker" />

import { env, pipeline } from "@xenova/transformers";
import { WHISPER_MODEL } from "./model";

type LoadMsg = { type: "load"; host: string };
type TranscribeMsg = {
  type: "transcribe";
  id: number;
  audio: Float32Array;
  language: "english" | "chinese";
};

type InMsg = LoadMsg | TranscribeMsg;

type ProgressEvent = {
  status?: string;
  file?: string;
  loaded?: number;
  total?: number;
  progress?: number;
};

const wasm = env.backends.onnx.wasm as { numThreads: number; wasmPaths: string; proxy?: boolean };

// Hypothesis H6: one WASM thread, so Safari and GitHub Pages work without COOP/COEP.
wasm.numThreads = 1;
if ("proxy" in wasm) wasm.proxy = false;
wasm.wasmPaths = new URL(`${import.meta.env.BASE_URL}onnx/`, self.location.origin).toString();

env.allowLocalModels = false;
env.useBrowserCache = true;

type Runner = (
  audio: Float32Array,
  options: { language: string; task: "transcribe" },
) => Promise<{ text?: string } | Array<{ text?: string }>>;

let transcriber: Runner | null = null;

function post(data: unknown) {
  self.postMessage(data);
}

function textOf(result: { text?: string } | Array<{ text?: string }>): string {
  const row = Array.isArray(result) ? result[0] : result;
  return (row?.text ?? "").trim();
}

self.onmessage = (event: MessageEvent<InMsg>) => {
  const data = event.data;
  if (data.type === "load") {
    env.remoteHost = data.host;
    void pipeline("automatic-speech-recognition", WHISPER_MODEL, {
      quantized: true,
      progress_callback: (update: ProgressEvent) => {
        post({
          type: "progress",
          status: update.status ?? "",
          file: update.file ?? "",
          loaded: update.loaded,
          total: update.total,
          progress: update.progress,
        });
      },
    })
      .then((asr) => {
        transcriber = asr as unknown as Runner;
        post({ type: "ready" });
      })
      .catch((err: unknown) => {
        post({ type: "error", message: err instanceof Error ? err.message : String(err) });
      });
    return;
  }

  const run = transcriber;
  if (!run) {
    post({ type: "error", id: data.id, message: "Voice model is not ready." });
    return;
  }
  void run(data.audio, { language: data.language, task: "transcribe" })
    .then((result) => post({ type: "result", id: data.id, text: textOf(result) }))
    .catch((err: unknown) => {
      post({ type: "error", id: data.id, message: err instanceof Error ? err.message : String(err) });
    });
};
