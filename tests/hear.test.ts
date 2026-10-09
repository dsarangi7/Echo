import { describe, expect, it } from "vitest";
import { chooseHearEngine, clipUrl } from "../src/speech/tts";
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
