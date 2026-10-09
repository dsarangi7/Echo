import { describe, expect, it } from "vitest";
import {
  DOWNLOAD_LABEL,
  IDLE_MODEL_NOTE,
  MODEL_LOAD_ERROR,
  configureLocalWhisper,
  formatDownloadProgress,
  localModelPath,
  whisperAssetUrl,
} from "../src/speech/model";

describe("model download progress", () => {
  it("keeps the first-load sentence when sizes are unknown", () => {
    expect(formatDownloadProgress(new Map())).toBe("Downloading Say it voice model…");
    expect(DOWNLOAD_LABEL).toBe("Downloading Say it voice model…");
  });

  it("adds a percent across files", () => {
    const files = new Map([
      ["encoder", { loaded: 5, total: 10 }],
      ["decoder", { loaded: 15, total: 30 }],
    ]);
    expect(formatDownloadProgress(files)).toBe("Downloading Say it voice model… 50%");
  });
});

describe("same-origin whisper", () => {
  it("points Transformers.js at this site and keeps remote hubs off", () => {
    const target = {
      allowLocalModels: false,
      allowRemoteModels: true,
      useBrowserCache: false,
      useFS: true,
      useFSCache: true,
      localModelPath: "",
    };
    configureLocalWhisper(target, "https://dsarangi7.github.io", "/Echo/");
    expect(target).toEqual({
      allowLocalModels: true,
      allowRemoteModels: false,
      useBrowserCache: true,
      useFS: false,
      useFSCache: false,
      localModelPath: "https://dsarangi7.github.io/Echo/models/",
    });
    expect(localModelPath("http://localhost:5173", "/Echo")).toBe("http://localhost:5173/Echo/models/");
    expect(whisperAssetUrl("https://dsarangi7.github.io", "/Echo/", "onnx/encoder_model_quantized.onnx")).toBe(
      "https://dsarangi7.github.io/Echo/models/Xenova/whisper-tiny/onnx/encoder_model_quantized.onnx",
    );
  });

  it("says Hear it is ready before Say it, and still ready if the model fails", () => {
    expect(IDLE_MODEL_NOTE).toContain("Hear it is ready");
    expect(IDLE_MODEL_NOTE).toContain("听一听可以直接用");
    expect(MODEL_LOAD_ERROR).toContain("Hear it still plays");
    expect(MODEL_LOAD_ERROR).toContain("听一听还能用");
    expect(MODEL_LOAD_ERROR).not.toMatch(/hf-mirror|huggingface/i);
    expect(IDLE_MODEL_NOTE).not.toMatch(/hf-mirror|huggingface/i);
  });
});
