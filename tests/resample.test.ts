import { describe, expect, it } from "vitest";
import { resampleTo16k } from "../src/speech/resample";

describe("resampleTo16k", () => {
  it("turns 48 kHz audio into 16 kHz", () => {
    const input = new Float32Array(48000);
    for (let i = 0; i < input.length; i++) input[i] = i;
    const out = resampleTo16k(input, 48000);
    expect(out.length).toBe(16000);
    expect(out[0]).toBe(0);
    expect(out[1]).toBeCloseTo(3, 5);
  });
});
