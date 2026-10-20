import { existsSync, readFileSync, statSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { playVictory, victoryClipUrl } from "../src/speech/victory";

describe("clear-match victory sound", () => {
  it("points at a small original chime under public/assets", () => {
    expect(victoryClipUrl("/Echo/")).toBe("/Echo/assets/victory.wav");
    expect(victoryClipUrl("/")).toBe("/assets/victory.wav");
    const file = "public/assets/victory.wav";
    expect(existsSync(file)).toBe(true);
    expect(statSync(file).size).toBeLessThan(60_000);
    const src = readFileSync("src/speech/victory.ts", "utf8");
    expect(src).toContain("configureClipAudio");
    expect(src).toContain("preferSpeakerPlayback");
    expect(src).not.toContain("AudioContext");
  });

  it("plays once and ignores a missing player or a rejected play()", () => {
    const played: string[] = [];
    playVictory((src) => {
      played.push(src);
      return {
        play: () => Promise.reject(new Error("autoplay")),
        volume: 1,
        muted: true,
        preload: "",
        playsInline: false,
        setAttribute: () => undefined,
      } as unknown as HTMLAudioElement;
    });
    expect(played).toEqual([victoryClipUrl()]);

    expect(() => playVictory(() => {
      throw new Error("no audio");
    })).not.toThrow();
    expect(() => playVictory(() => null)).not.toThrow();
  });
});
