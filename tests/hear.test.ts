import { describe, expect, it } from "vitest";
import { HEAR_FAIL, chooseHearEngine, clipUrl, configureClipAudio, preferSpeakerPlayback } from "../src/speech/tts";
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
