import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { VENDORED_WHISPER_FILES, WHISPER_MODEL } from "../src/speech/model";

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

  it("does not fetch the voice model from a remote hub", () => {
    const sources = filesUnder("src/speech").filter((path) => /\.ts$/.test(path));
    expect(sources.length).toBeGreaterThan(3);
    for (const path of sources) {
      const text = readFileSync(path, "utf8");
      expect(text, path).not.toMatch(/huggingface\.co/);
      expect(text, path).not.toMatch(/hf-mirror\.com/);
    }
    const worker = readFileSync("src/speech/whisper.worker.ts", "utf8");
    expect(worker).toContain("configureLocalWhisper");
    expect(worker).not.toContain("allowLocalModels = false");
    expect(worker).toContain("initialPrompt");
    expect(worker).toContain("whisperInitialPromptIds");
    expect(worker).toContain("decoder_input_ids");
    expect(worker).toContain("installInitialPromptStrip");
    expect(worker).toContain('task: "transcribe"');
    const stt = readFileSync("src/speech/stt.ts", "utf8");
    expect(stt).toContain("initialPrompt");
    expect(stt).toContain("whisperLanguage(lang)");
    const practice = readFileSync("src/practice/usePractice.ts", "utf8");
    const hear = practice.slice(practice.indexOf("const hear"), practice.indexOf("const sayIt"));
    expect(hear).not.toContain("ensureModel");
    expect(practice.slice(practice.indexOf("const sayIt"))).toContain("ensureModel()");
    expect(practice.slice(practice.indexOf("useEffect(() => {\n    const synth"), practice.indexOf("const jump"))).not.toContain(
      "ensureModel",
    );
    const opened = practice.slice(0, practice.indexOf("const synth"));
    expect(opened).toContain("void ensureModel()");
    expect(opened).toContain("playIntro(langRef.current, true)");
    expect(practice).toContain("playIntro(next)");
    expect(practice).toContain("transcribe(pcm, targetLang, targetLine)");
    expect(practice).toContain("minSpeechMs");
    expect(practice).toContain("SHORT_ZH_MIN_SPEECH_MS");
    expect(practice).toContain('outcome === "recognition_fail"');
    expect(readFileSync("src/components/PracticePanel.tsx", "utf8")).toContain("Try again");
    expect(readFileSync("src/components/PracticePanel.tsx", "utf8")).toContain("recognition_fail");
    expect(readFileSync("src/components/TargetSentence.tsx", "utf8")).toContain('"unk"');
    expect(readFileSync("src/App.tsx", "utf8")).toContain('onIntroduce={practice.introduce}');
    expect(readFileSync("src/components/CatMascot.tsx", "utf8")).toContain('id="cat-intro"');
  });
});

describe("vendored whisper tiny", () => {
  const root = `public/models/${WHISPER_MODEL}`;

  it("ships the quantized files Transformers.js requests", () => {
    for (const file of VENDORED_WHISPER_FILES) {
      const path = join(root, file);
      const size = statSync(path).size;
      const head = readFileSync(path).subarray(0, 48).toString("utf8");
      expect(head, path).not.toContain("git-lfs");
      expect(head.startsWith("<"), path).toBe(false);
      if (file.endsWith(".onnx")) expect(size, path).toBeGreaterThan(1_000_000);
      else expect(size, path).toBeGreaterThan(100);
    }
    expect(statSync(join(root, "onnx/encoder_model_quantized.onnx")).size).toBe(10_124_910);
    expect(statSync(join(root, "onnx/decoder_model_merged_quantized.onnx")).size).toBe(30_727_765);
    const config = JSON.parse(readFileSync(join(root, "config.json"), "utf8")) as { model_type?: string };
    expect(config.model_type).toBe("whisper");
  });
});

describe("bundled voice pack", () => {
  it("has 100 English and 100 Chinese clips", () => {
    for (const lang of ["en", "zh"]) {
      const names = readdirSync(`public/audio/${lang}`).filter((name) => name.endsWith(".mp3")).sort();
      expect(names).toHaveLength(100);
      expect(names[0]).toBe("000.mp3");
      expect(names[99]).toBe("099.mp3");
      // Near-empty Piper stubs were about 2–4 KB and under a second. Real 40 kbps lines are larger.
      for (const name of names) {
        expect(statSync(`public/audio/${lang}/${name}`).size, `${lang}/${name}`).toBeGreaterThan(5000);
      }
    }
  });
});
