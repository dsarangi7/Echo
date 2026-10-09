import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { WHISPER_MODEL } from "../src/speech/model";

function filesUnder(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) out.push(...filesUnder(path));
    else out.push(path);
  }
  return out;
}

describe("Say it does not use Google speech recognition", () => {
  it("keeps Web Speech Recognition out of the app source", () => {
    const sources = filesUnder("src").filter((path) => /\.(ts|tsx)$/.test(path));
    expect(sources.length).toBeGreaterThan(5);
    for (const path of sources) {
      const text = readFileSync(path, "utf8");
      expect(text, path).not.toMatch(/webkitSpeechRecognition/);
      expect(text, path).not.toMatch(/SpeechRecognition/);
    }
  });

  it("names the on-device Whisper tiny model", () => {
    expect(WHISPER_MODEL).toBe("Xenova/whisper-tiny");
  });
});

describe("bundled voice pack", () => {
  it("has 100 English and 100 Chinese clips", () => {
    for (const lang of ["en", "zh"]) {
      const names = readdirSync(`public/audio/${lang}`).filter((name) => name.endsWith(".mp3")).sort();
      expect(names).toHaveLength(100);
      expect(names[0]).toBe("000.mp3");
      expect(names[99]).toBe("099.mp3");
      expect(statSync(`public/audio/${lang}/000.mp3`).size).toBeGreaterThan(2000);
    }
  });
});
