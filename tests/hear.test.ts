import { describe, expect, it } from "vitest";
import { statSync } from "node:fs";
import {
  DEVICE_UTTERANCE_BASE,
  HEAR_FAIL,
  applyPlaybackRate,
  chooseHearEngine,
  clipUrl,
  configureClipAudio,
  deviceUtteranceRate,
  preferSpeakerPlayback,
  setSpeakingRate,
  speakClip,
  stopSpeaking,
} from "../src/speech/tts";
import { introClipUrl, introLine } from "../src/speech/intro";
import {
  HEAR_PACE_LABEL,
  HEAR_PACE_RATE,
  defaultHearPaces,
  hearPaceRate,
  parseHearPaces,
} from "../src/practice/pace";
import { loadHearPaces, saveHearPaces } from "../src/practice/storage";
import { rankVoices } from "../src/practice/voices";

describe("Hear it engine", () => {
  it("plays the bundled clip before device speech synthesis", () => {
    expect(chooseHearEngine(true, true)).toBe("pack");
    expect(chooseHearEngine(false, true)).toBe("synthesis");
    expect(chooseHearEngine(false, false)).toBe("none");
  });

  it("points clips at the Pages base", () => {
    expect(clipUrl("en", 0, "/Echo/")).toBe("/Echo/audio/en/000.mp3");
    expect(clipUrl("zh", 12, "/Echo/")).toBe("/Echo/audio/zh/012.mp3");
  });

  it("speaks a short introduction in the current language", () => {
    expect(introLine("en")).toContain("Echo");
    expect(introLine("en")).toContain("Hear it");
    expect(introLine("zh")).toContain("课猫");
    expect(introLine("zh")).toContain("听一听");
    expect(introLine("en")).not.toBe(introLine("zh"));
    expect(introClipUrl("en", "/Echo/")).toBe("/Echo/audio/intro/en.mp3");
    expect(introClipUrl("zh", "/")).toBe("/audio/intro/zh.mp3");
    expect(statSync("public/audio/intro/en.mp3").size).toBeGreaterThan(5000);
    expect(statSync("public/audio/intro/zh.mp3").size).toBeGreaterThan(5000);
  });

  it("prepares an inline clip and asks iOS to use the speaker", () => {
    const attrs = new Map<string, string>();
    const audio = {
      preload: "",
      playsInline: false,
      volume: 0,
      muted: true,
      setAttribute(name: string, value: string) {
        attrs.set(name, value);
      },
    } as unknown as HTMLAudioElement;
    configureClipAudio(audio);
    expect(audio.preload).toBe("auto");
    expect(audio.playsInline).toBe(true);
    expect(audio.muted).toBe(false);
    expect(audio.volume).toBe(1);
    expect(attrs.get("playsinline")).toBe("true");
    expect(attrs.get("webkit-playsinline")).toBe("true");
    expect(attrs.get("preload")).toBe("auto");

    const session = { type: "auto" };
    preferSpeakerPlayback({ audioSession: session });
    expect(session.type).toBe("playback");
    preferSpeakerPlayback(undefined);
  });

  it("explains a failed Hear it in both languages without blaming the voice model", () => {
    expect(HEAR_FAIL).toContain("Could not play this line");
    expect(HEAR_FAIL).toContain("这句没播出来");
    expect(HEAR_FAIL).toContain("does not need the voice model");
    expect(HEAR_FAIL).toContain("听一听不需要语音模型");
  });
});

describe("Hear it pace", () => {
  it("keeps English at the file speed and starts Chinese slower", () => {
    const paces = defaultHearPaces();
    expect(paces).toEqual({ en: "normal", zh: "slow" });
    expect(hearPaceRate(paces.en)).toBe(1);
    expect(hearPaceRate(paces.zh)).toBe(0.75);
    expect(HEAR_PACE_RATE).toEqual({ slow: 0.75, normal: 1, fast: 1.25 });
    expect(HEAR_PACE_LABEL.slow).toEqual({ en: "Slow", zh: "慢" });
    expect(HEAR_PACE_LABEL.normal.zh).toBe("正常");
    expect(HEAR_PACE_LABEL.fast.en).toBe("Fast");
  });

  it("drops a bad saved pace and keeps the other language", () => {
    expect(parseHearPaces({ en: "fast", zh: "turtle" })).toEqual({ en: "fast", zh: "slow" });
    expect(parseHearPaces(null)).toEqual({ en: "normal", zh: "slow" });
    expect(parseHearPaces("slow")).toEqual({ en: "normal", zh: "slow" });
  });

  it("remembers each language in localStorage", () => {
    const mem = new Map<string, string>();
    const storage = {
      getItem: (key: string) => (mem.has(key) ? mem.get(key)! : null),
      setItem: (key: string, value: string) => {
        mem.set(key, value);
      },
      removeItem: (key: string) => {
        mem.delete(key);
      },
      clear: () => mem.clear(),
      key: (index: number) => [...mem.keys()][index] ?? null,
      get length() {
        return mem.size;
      },
    };
    Object.defineProperty(globalThis, "localStorage", { value: storage, configurable: true });

    expect(loadHearPaces()).toEqual({ en: "normal", zh: "slow" });
    saveHearPaces({ en: "fast", zh: "normal" });
    expect(loadHearPaces()).toEqual({ en: "fast", zh: "normal" });
    mem.set("echo-hear-pace", "{");
    expect(loadHearPaces()).toEqual({ en: "normal", zh: "slow" });
  });

  it("plays a clip at the chosen rate and can slow it while it is still going", () => {
    const audio = {
      playbackRate: 1,
      preservesPitch: false,
      webkitPreservesPitch: false,
    } as HTMLAudioElement & { webkitPreservesPitch?: boolean };
    applyPlaybackRate(audio, 0.75);
    expect(audio.playbackRate).toBe(0.75);
    expect(audio.preservesPitch).toBe(true);
    expect(audio.webkitPreservesPitch).toBe(true);
    applyPlaybackRate(audio, Number.NaN);
    expect(audio.playbackRate).toBe(1);

    const clip = {
      preload: "",
      playsInline: false,
      volume: 0,
      muted: true,
      playbackRate: 1,
      preservesPitch: false,
      webkitPreservesPitch: false,
      src: "",
      style: { cssText: "" },
      setAttribute() {},
      removeAttribute() {},
      pause() {},
      remove() {},
      play() {
        return Promise.resolve();
      },
      onplaying: null as null | (() => void),
      onended: null as null | (() => void),
      onerror: null as null | (() => void),
    };
    const previousWindow = globalThis.window;
    const previousDocument = globalThis.document;
    globalThis.window = {
      clearInterval() {},
      clearTimeout() {},
      setInterval: () => 1,
      setTimeout: () => 1,
      speechSynthesis: { cancel() {} },
    } as unknown as Window & typeof globalThis;
    globalThis.document = {
      createElement: () => clip,
      body: { appendChild() {} },
    } as unknown as Document;
    try {
      speakClip(
        "zh",
        "/audio/zh/000.mp3",
        "你好",
        { onStart() {}, onMouth() {}, onEnd() {}, onUnavailable() {} },
        0.75,
      );
      expect(clip.playbackRate).toBe(0.75);
      expect(clip.preservesPitch).toBe(true);
      expect(clip.webkitPreservesPitch).toBe(true);
      setSpeakingRate(1);
      expect(clip.playbackRate).toBe(1);
      clip.onplaying?.();
      expect(clip.playbackRate).toBe(1);
      stopSpeaking();
    } finally {
      globalThis.window = previousWindow;
      globalThis.document = previousDocument;
    }
  });

  it("scales the device voice by the same pace and leaves Normal at 0.92", () => {
    expect(DEVICE_UTTERANCE_BASE).toBe(0.92);
    expect(deviceUtteranceRate(1)).toBeCloseTo(0.92);
    expect(deviceUtteranceRate(0.75)).toBeCloseTo(0.69);
    expect(deviceUtteranceRate(1.25)).toBeCloseTo(1.15);
    expect(deviceUtteranceRate(Number.NaN)).toBeCloseTo(0.92);
  });
});

describe("sweet female voice ranking", () => {
  it("prefers a female English voice over a male one", () => {
    const picked = rankVoices(
      [
        { name: "Daniel", lang: "en-GB", localService: true },
        { name: "Microsoft Aria", lang: "en-US", localService: false },
        { name: "Alex", lang: "en-US", localService: true },
      ],
      "en",
    );
    expect(picked?.name).toBe("Microsoft Aria");
  });

  it("prefers a mainland female Chinese voice", () => {
    const picked = rankVoices(
      [
        { name: "Yunyang", lang: "zh-CN" },
        { name: "Microsoft Xiaoxiao", lang: "zh-CN", localService: true },
        { name: "Meijia", lang: "zh-TW" },
      ],
      "zh",
    );
    expect(picked?.name).toBe("Microsoft Xiaoxiao");
  });
});
