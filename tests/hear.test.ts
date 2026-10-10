import { describe, expect, it } from "vitest";
import { statSync } from "node:fs";
import {
  DEVICE_UTTERANCE_BASE,
  HEAR_FAIL_COPY,
  applyPlaybackRate,
  chooseHearEngine,
  classifyMediaFailure,
  classifyPlayRejection,
  classifySynthError,
  clipUrl,
  configureClipAudio,
  deviceUtteranceRate,
  hearFailCopy,
  preferSpeakerPlayback,
  resolveHearFailure,
  setSpeakingRate,
  speakClip,
  stopSpeaking,
  type HearFailReason,
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

  it("names a missing file, blocked playback, a clip still loading, and a device-voice failure", () => {
    const reasons: HearFailReason[] = ["missing", "blocked", "loading", "synth"];
    const copies = reasons.map((reason) => hearFailCopy(reason));
    expect(new Set(copies).size).toBe(reasons.length);
    expect(hearFailCopy("missing")).toBe(HEAR_FAIL_COPY.missing);
    expect(HEAR_FAIL_COPY.missing).toContain("sound file is missing");
    expect(HEAR_FAIL_COPY.missing).toContain("音频文件没有");
    expect(HEAR_FAIL_COPY.blocked).toContain("Playback was blocked");
    expect(HEAR_FAIL_COPY.blocked).toContain("播放被拦住了");
    expect(HEAR_FAIL_COPY.loading).toContain("still loading");
    expect(HEAR_FAIL_COPY.loading).toContain("还在加载");
    expect(HEAR_FAIL_COPY.synth).toContain("device voice could not speak");
    expect(HEAR_FAIL_COPY.synth).toContain("这台设备的语音没把这句说出来");
    for (const copy of copies) {
      expect(copy).toMatch(/[A-Za-z]/);
      expect(copy).toMatch(/[\u4e00-\u9fff]/);
      expect(copy.toLowerCase()).not.toContain("voice model");
      expect(copy).not.toContain("语音模型");
      expect(copy.toLowerCase()).not.toContain("does not need");
      expect(copy).not.toContain("不需要");
    }
  });

  it("keeps a missing file, a blocked play, and a clip that is still loading distinct from a device-voice failure", () => {
    expect(classifyPlayRejection({ name: "NotAllowedError" })).toBe("blocked");
    expect(classifyPlayRejection({ name: "SecurityError" })).toBe("blocked");
    expect(classifyPlayRejection(new Error("The request is not allowed by the user agent."))).toBe("blocked");
    expect(classifyPlayRejection({ name: "NotSupportedError" })).toBe("missing");
    expect(classifyPlayRejection({ name: "AbortError" })).toBe("other");

    expect(classifyMediaFailure({ errorCode: 4, readyState: 0, networkState: 3, timedOut: false })).toBe("missing");
    expect(classifyMediaFailure({ errorCode: 3, readyState: 2, networkState: 1, timedOut: false })).toBe("missing");
    expect(classifyMediaFailure({ errorCode: 1, readyState: 0, networkState: 0, timedOut: false })).toBe("blocked");
    expect(classifyMediaFailure({ errorCode: 2, readyState: 1, networkState: 2, timedOut: false })).toBe("loading");
    expect(classifyMediaFailure({ errorCode: null, readyState: 0, networkState: 3, timedOut: true })).toBe("missing");
    expect(classifyMediaFailure({ errorCode: null, readyState: 1, networkState: 2, timedOut: true })).toBe("loading");
    expect(classifyMediaFailure({ errorCode: null, readyState: 4, networkState: 1, timedOut: true })).toBe("other");

    expect(classifySynthError("not-allowed", true)).toBe("blocked");
    expect(classifySynthError("synthesis-failed", true)).toBe("failed");
    expect(classifySynthError(null, false)).toBe("unavailable");

    expect(resolveHearFailure("missing", "failed")).toBe("missing");
    expect(resolveHearFailure("missing", "blocked")).toBe("missing");
    expect(resolveHearFailure("loading", "blocked")).toBe("loading");
    expect(resolveHearFailure("loading", "failed")).toBe("loading");
    expect(resolveHearFailure("blocked", "failed")).toBe("blocked");
    expect(resolveHearFailure("other", "blocked")).toBe("blocked");
    expect(resolveHearFailure("other", "failed")).toBe("synth");
    expect(resolveHearFailure("other", "unavailable")).toBe("synth");
  });
});

describe("Hear it failure through playback", () => {
  type FakeClip = {
    preload: string;
    playsInline: boolean;
    volume: number;
    muted: boolean;
    playbackRate: number;
    preservesPitch: boolean;
    webkitPreservesPitch: boolean;
    readyState: number;
    networkState: number;
    error: { code: number } | null;
    src: string;
    style: { cssText: string };
    setAttribute: () => void;
    removeAttribute: () => void;
    pause: () => void;
    remove: () => void;
    play: () => Promise<void>;
    onplaying: (() => void) | null;
    onended: (() => void) | null;
    onerror: (() => void) | null;
  };

  async function playFailure(options: {
    play: () => Promise<void>;
    readyState?: number;
    networkState?: number;
    errorCode?: number | null;
    synth?: "none" | "not-allowed" | "synthesis-failed";
    timeout?: boolean;
    mediaError?: boolean;
  }): Promise<HearFailReason> {
    const reasons: HearFailReason[] = [];
    const timers: Array<() => void> = [];
    const clip: FakeClip = {
      preload: "",
      playsInline: false,
      volume: 1,
      muted: false,
      playbackRate: 1,
      preservesPitch: false,
      webkitPreservesPitch: false,
      readyState: options.readyState ?? 0,
      networkState: options.networkState ?? 2,
      error: options.errorCode == null ? null : { code: options.errorCode },
      src: "",
      style: { cssText: "" },
      setAttribute() {},
      removeAttribute() {},
      pause() {},
      remove() {},
      play: options.play,
      onplaying: null,
      onended: null,
      onerror: null,
    };
    const previousWindow = globalThis.window;
    const previousDocument = globalThis.document;
    const previousUtterance = globalThis.SpeechSynthesisUtterance;
    class FakeUtterance {
      lang = "";
      rate = 1;
      pitch = 1;
      voice: unknown = null;
      onstart: (() => void) | null = null;
      onend: (() => void) | null = null;
      onerror: ((event: { error: string }) => void) | null = null;
      constructor(public text: string) {}
    }
    globalThis.window = {
      clearInterval() {},
      clearTimeout() {},
      setInterval: () => 1,
      setTimeout: (fn: () => void) => {
        timers.push(fn);
        return timers.length;
      },
      speechSynthesis:
        options.synth && options.synth !== "none"
          ? {
              cancel() {},
              resume() {},
              getVoices: () => [],
              speak(utterance: FakeUtterance) {
                utterance.onerror?.({ error: options.synth === "not-allowed" ? "not-allowed" : "synthesis-failed" });
              },
            }
          : undefined,
    } as unknown as Window & typeof globalThis;
    globalThis.document = {
      createElement: () => clip,
      body: { appendChild() {} },
    } as unknown as Document;
    if (options.synth && options.synth !== "none") {
      globalThis.SpeechSynthesisUtterance = FakeUtterance as unknown as typeof SpeechSynthesisUtterance;
    } else {
      // @ts-expect-error test double removes the constructor the playback code checks for
      delete globalThis.SpeechSynthesisUtterance;
    }
    try {
      speakClip("en", "/audio/en/000.mp3", "Hello", {
        onStart() {},
        onMouth() {},
        onEnd() {},
        onUnavailable(reason) {
          reasons.push(reason);
        },
      });
      if (options.mediaError) clip.onerror?.();
      if (options.timeout) timers[0]?.();
      await Promise.resolve();
      await Promise.resolve();
      expect(reasons).toHaveLength(1);
      return reasons[0];
    } finally {
      stopSpeaking();
      globalThis.window = previousWindow;
      globalThis.document = previousDocument;
      if (previousUtterance) globalThis.SpeechSynthesisUtterance = previousUtterance;
      else delete globalThis.SpeechSynthesisUtterance;
    }
  }

  it("reports a missing sound file even if the device voice is also blocked", async () => {
    const reason = await playFailure({
      play: () => new Promise(() => undefined),
      errorCode: 4,
      networkState: 3,
      readyState: 0,
      mediaError: true,
      synth: "not-allowed",
    });
    expect(reason).toBe("missing");
    expect(hearFailCopy(reason)).toContain("音频文件没有");
    expect(hearFailCopy(reason).toLowerCase()).not.toContain("voice model");
  });

  it("reports blocked playback when the browser refuses play()", async () => {
    const reason = await playFailure({
      play: () => Promise.reject(Object.assign(new Error("play blocked"), { name: "NotAllowedError" })),
      synth: "none",
    });
    expect(reason).toBe("blocked");
    expect(hearFailCopy(reason)).toContain("再点一次");
  });

  it("reports the line audio as still loading when the clip has not started", async () => {
    const reason = await playFailure({
      play: () => new Promise(() => undefined),
      readyState: 1,
      networkState: 2,
      errorCode: null,
      timeout: true,
      synth: "synthesis-failed",
    });
    expect(reason).toBe("loading");
    expect(hearFailCopy(reason)).toContain("还在加载");
    expect(hearFailCopy(reason)).not.toContain("语音模型");
  });

  it("reports the device voice when the clip gives no specific audio error", async () => {
    const reason = await playFailure({
      play: () => new Promise(() => undefined),
      readyState: 4,
      networkState: 1,
      errorCode: null,
      timeout: true,
      synth: "synthesis-failed",
    });
    expect(reason).toBe("synth");
    expect(hearFailCopy(reason)).toContain("这台设备的语音");
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
