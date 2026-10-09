import { describe, expect, it } from "vitest";
import { DOWNLOAD_LABEL, formatDownloadProgress } from "../src/speech/model";

describe("model download progress", () => {
  it("keeps the first-load sentence when sizes are unknown", () => {
    expect(formatDownloadProgress(new Map())).toBe("Downloading free voice model…");
    expect(DOWNLOAD_LABEL).toBe("Downloading free voice model…");
  });

  it("adds a percent across files", () => {
    const files = new Map([
      ["encoder", { loaded: 5, total: 10 }],
      ["decoder", { loaded: 15, total: 30 }],
    ]);
    expect(formatDownloadProgress(files)).toBe("Downloading free voice model… 50%");
  });
});
