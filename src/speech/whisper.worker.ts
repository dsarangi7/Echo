/// <reference lib="webworker" />

import { env, pipeline } from "@xenova/transformers";
import { WHISPER_MODEL, configureLocalWhisper, type LocalTransformerEnv } from "./model";
import { stripPromptPrefixFromOutput, whisperInitialPromptIds, type WhisperPromptLanguage } from "./whisper-prompt";

type LoadMsg = { type: "load" };
type TranscribeMsg = {
  type: "transcribe";
  id: number;
  audio: Float32Array;
  /** Locked to the practice language. Never left unset, so Whisper does not auto-detect. */
  language: WhisperPromptLanguage;
  /** Target line, used as a Whisper initial prompt. Empty skips the bias. */
  initialPrompt?: string;
};

type InMsg = LoadMsg | TranscribeMsg;

type ProgressEvent = {
  status?: string;
  file?: string;
  loaded?: number;
  total?: number;
  progress?: number;
};

type TranscribeOptions = {
  language: string;
  task: "transcribe";
  decoder_input_ids?: number[];
};

type Tokenizer = {
  encode(text: string, textPair: null, options: { add_special_tokens: boolean }): ArrayLike<number>;
  all_special_ids?: number[];
};

type GenerateConfig = { decoder_input_ids?: number[] } | null | undefined;

type Generate = (inputs: unknown, generationConfig?: GenerateConfig, logitsProcessor?: unknown) => Promise<unknown>;

type Runner = (audio: Float32Array, options: TranscribeOptions) => Promise<{ text?: string } | Array<{ text?: string }>>;

type Asr = Runner & {
  tokenizer: Tokenizer;
  model: { generate: Generate };
};

const wasm = env.backends.onnx.wasm as { numThreads: number; wasmPaths: string; proxy?: boolean };

// Hypothesis H6: one WASM thread, so Safari and GitHub Pages work without COOP/COEP.
wasm.numThreads = 1;
if ("proxy" in wasm) wasm.proxy = false;
wasm.wasmPaths = new URL(`${import.meta.env.BASE_URL}onnx/`, self.location.origin).toString();

configureLocalWhisper(env as unknown as LocalTransformerEnv, self.location.origin, import.meta.env.BASE_URL);

let transcriber: Asr | null = null;

function post(data: unknown) {
  self.postMessage(data);
}

function textOf(result: { text?: string } | Array<{ text?: string }>): string {
  const row = Array.isArray(result) ? result[0] : result;
  return (row?.text ?? "").trim();
}

function encodeInitialPrompt(tokenizer: Tokenizer, text: string): number[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  try {
    const specials = new Set(tokenizer.all_special_ids ?? []);
    return Array.from(tokenizer.encode(` ${trimmed}`, null, { add_special_tokens: false }), (id) => Number(id)).filter(
      (id) => Number.isInteger(id) && !specials.has(id),
    );
  } catch {
    return [];
  }
}

/**
 * Strip `<|startofprev|>` context from the decoded token ids.
 * If this Transformers.js build ignores `decoder_input_ids`, the sequence will
 * not start with that prefix and the transcript is left unchanged.
 */
function installInitialPromptStrip(model: { generate: Generate }) {
  const original = model.generate.bind(model);
  model.generate = (inputs, generationConfig, logitsProcessor) => {
    const prefix = Array.isArray(generationConfig?.decoder_input_ids) ? [...generationConfig.decoder_input_ids] : [];
    return Promise.resolve(original(inputs, generationConfig, logitsProcessor)).then((produced) =>
      prefix.length > 0 ? stripPromptPrefixFromOutput(produced, prefix) : produced,
    );
  };
}

self.onmessage = (event: MessageEvent<InMsg>) => {
  const data = event.data;
  if (data.type === "load") {
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
        const ready = asr as unknown as Asr;
        installInitialPromptStrip(ready.model);
        transcriber = ready;
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

  const promptIds = whisperInitialPromptIds(encodeInitialPrompt(run.tokenizer, data.initialPrompt ?? ""), data.language);
  const options: TranscribeOptions = {
    language: data.language,
    task: "transcribe",
    ...(promptIds ? { decoder_input_ids: promptIds } : {}),
  };

  void run(data.audio, options)
    .then((result) => post({ type: "result", id: data.id, text: textOf(result) }))
    .catch((err: unknown) => {
      post({ type: "error", id: data.id, message: err instanceof Error ? err.message : String(err) });
    });
};
