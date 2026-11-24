import { pinyin } from "pinyin-pro";
import { existsSync, statSync } from "node:fs";
import { afterEach, describe, expect, it } from "vitest";
import { syllableTone } from "../src/practice/pinyin";
import { gradeTranscript } from "../src/practice/score";
import { setSoundOf, toSimplified } from "../src/practice/zhSound";
import { readVoiceModel, voiceModelId, WHISPER_ACCURATE_MODEL, WHISPER_MODEL } from "../src/speech/model";
import { parsePrefs } from "../src/ui/prefs";
import { seasonFor } from "../src/ui/season";

function installPinyin() {
  setSoundOf((char) => (/\p{Script=Han}/u.test(char) ? pinyin(char, { toneType: "none", multiple: true, type: "array" }) : []));
}

describe("Chinese scoring folds what Whisper writes", () => {
  afterEach(() => setSoundOf(null));

  it("maps traditional characters to simplified", () => {
    expect(toSimplified("會議室要提前預約")).toBe("会议室要提前预约");
  });

  it("counts traditional output as a match", () => {
    const grade = gradeTranscript("zh", "会议室要提前预约。", "會議室要提前預約");
    expect(grade.outcome).toBe("scored");
    expect(grade.good).toBe(8);
  });

  it("matches a homophone once readings are loaded", () => {
    expect(gradeTranscript("zh", "采购订单收到了吗？", "才购定单收到了吗").good).toBe(6);
    installPinyin();
    expect(gradeTranscript("zh", "采购订单收到了吗？", "才购定单收到了吗").good).toBe(8);
  });

  it("still marks a different sound as missing", () => {
    installPinyin();
    const grade = gradeTranscript("zh", "我想买衣服。", "我想卖衣服");
    expect(grade.marks).toEqual([true, true, true, true, true]);
    const wrong = gradeTranscript("zh", "我想买衣服。", "我要买裤子");
    expect(wrong.marks).toEqual([true, false, true, false, false]);
  });

  it("leaves English scoring alone", () => {
    installPinyin();
    expect(gradeTranscript("en", "I sent the invoice.", "I send the invoice").good).toBe(3);
  });
});

describe("tone colors", () => {
  it("reads the tone from the mark", () => {
    expect(["mā", "má", "mǎ", "mà", "ma", "zhèr", "lǜ"].map(syllableTone)).toEqual([1, 2, 3, 4, 0, 4, 4]);
  });
});

describe("cat outfits", () => {
  it("follows the Shanghai calendar", () => {
    expect(seasonFor(new Date("2027-02-05T12:00:00+08:00"))).toBe("spring-festival");
    expect(seasonFor(new Date("2026-09-25T12:00:00+08:00"))).toBe("mid-autumn");
    expect(seasonFor(new Date("2026-12-24T12:00:00+08:00"))).toBe("winter");
    expect(seasonFor(new Date("2026-06-10T12:00:00+08:00"))).toBe("plain");
    // 23:30 UTC on 14 Jan is already 15 Jan in Shanghai.
    expect(seasonFor(new Date("2027-01-14T23:30:00Z"))).toBe("spring-festival");
  });
});

describe("voice model choice", () => {
  const store = (value: string | null) => ({ getItem: () => value });

  it("is always Fast on the website", () => {
    expect(readVoiceModel(store("accurate"), false)).toBe("fast");
    expect(voiceModelId("accurate", false)).toBe(WHISPER_MODEL);
  });

  it("defaults to Accurate in the app and remembers Fast", () => {
    expect(readVoiceModel(store(null), true)).toBe("accurate");
    expect(readVoiceModel(store("fast"), true)).toBe("fast");
    expect(voiceModelId("accurate", true)).toBe(WHISPER_ACCURATE_MODEL);
  });

  it("vendors Whisper base for the app build", () => {
    const root = `public/models/${WHISPER_ACCURATE_MODEL}`;
    expect(statSync(`${root}/onnx/encoder_model_quantized.onnx`).size).toBe(23_200_850);
    expect(statSync(`${root}/onnx/decoder_model_merged_quantized.onnx`).size).toBe(53_707_539);
    expect(existsSync(`${root}/tokenizer.json`)).toBe(true);
  });
});

describe("prefs", () => {
  it("defaults on and survives junk", () => {
    expect(parsePrefs(null)).toEqual({ toneColors: true, feedback: true });
    expect(parsePrefs("{oops")).toEqual({ toneColors: true, feedback: true });
    expect(parsePrefs('{"toneColors":false}')).toEqual({ toneColors: false, feedback: true });
  });
});
