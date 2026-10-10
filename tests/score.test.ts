import { describe, expect, it } from "vitest";
import {
  OVERLAP_FAIL_RATIO,
  RECOGNITION_FAIL_EN,
  SHORT_ZH_MAX_CHARS,
  SHORT_ZH_OVERLAP_FAIL_RATIO,
  charsOf,
  gradeTranscript,
  isShortZhLine,
  micHeardLine,
  recognitionFailHeadline,
  wordsOf,
} from "../src/practice/score";
import { MIN_SPEECH_MS, SHORT_ZH_MIN_SPEECH_MS } from "../src/speech/record";

describe("word and character scoring", () => {
  it("counts English words and does not invent a percent", () => {
    const graded = gradeTranscript("en", "The printer seems out of paper.", "the printer seems out");
    expect(wordsOf("The printer seems out of paper.")).toEqual(["the", "printer", "seems", "out", "of", "paper"]);
    expect(graded.good).toBe(4);
    expect(graded.total).toBe(6);
    expect(graded.label).toBe("4 of 6 words");
    expect(graded.label).not.toMatch(/%/);
    expect(graded.outcome).toBe("scored");
    expect(graded.marks).toEqual([true, true, true, true, false, false]);
  });

  it("counts Chinese characters", () => {
    const graded = gradeTranscript("zh", "我今天加班到七点。", "我今天加班");
    expect(charsOf("我今天加班到七点。")).toEqual(["我", "今", "天", "加", "班", "到", "七", "点"]);
    expect(graded.label).toBe("5 of 8 字");
    expect(graded.label).not.toMatch(/%/);
    expect(graded.outcome).toBe("scored");
  });

  it("soft-fails a wildly unrelated Chinese line instead of 0 of N", () => {
    const graded = gradeTranscript("zh", "放门口就行", "我希望您注意到");
    expect(charsOf("放门口就行")).toHaveLength(5);
    expect(graded.outcome).toBe("recognition_fail");
    expect(graded.marks).toBeNull();
    expect(graded.label).toBe("");
    expect(graded.label).not.toMatch(/0 of/);
    expect(graded.label).not.toMatch(/%/);
    expect(graded.overlapRatio).toBe(0);
    expect(graded.heardPreview).toBe("我希望您注意到");
    expect(graded.total).toBe(5);
  });

  it("scores an exact short Chinese match as 5 of 5", () => {
    const graded = gradeTranscript("zh", "放门口就行", "放门口就行");
    expect(graded.outcome).toBe("scored");
    expect(graded.good).toBe(5);
    expect(graded.total).toBe(5);
    expect(graded.label).toBe("5 of 5 字");
    expect(graded.marks).toEqual([true, true, true, true, true]);
    expect(graded.label).not.toMatch(/%/);
  });

  it("still scores a short Chinese line that misses one or two characters", () => {
    const oneMiss = gradeTranscript("zh", "放门口就行", "放门口就");
    expect(oneMiss.outcome).toBe("scored");
    expect(oneMiss.good).toBe(4);
    expect(oneMiss.total).toBe(5);
    expect(oneMiss.label).toBe("4 of 5 字");

    const twoMiss = gradeTranscript("zh", "放门口就行", "放门口");
    expect(twoMiss.outcome).toBe("scored");
    expect(twoMiss.good).toBe(3);
    expect(twoMiss.total).toBe(5);
    expect(twoMiss.label).toBe("3 of 5 字");
  });

  it("soft-fails a short Chinese line with only one shared character", () => {
    const graded = gradeTranscript("zh", "放门口就行", "放");
    expect(graded.good).toBe(1);
    expect(graded.overlapRatio).toBeCloseTo(1 / 5);
    expect(graded.overlapRatio).toBeLessThanOrEqual(SHORT_ZH_OVERLAP_FAIL_RATIO);
    expect(graded.outcome).toBe("recognition_fail");
    expect(graded.marks).toBeNull();
    expect(graded.label).toBe("");
  });

  it("soft-fails when overlap is under 0.15 even if one token matched", () => {
    const target = "alpha bravo charlie delta echo foxtrot golf hotel india juliet";
    const graded = gradeTranscript("en", target, "alpha zebra");
    expect(wordsOf(target)).toHaveLength(10);
    expect(graded.good).toBe(1);
    expect(graded.overlapRatio).toBeCloseTo(0.1);
    expect(graded.overlapRatio).toBeLessThan(OVERLAP_FAIL_RATIO);
    expect(graded.outcome).toBe("recognition_fail");
    expect(graded.label).toBe("");
    expect(graded.marks).toBeNull();
  });

  it("rejects empty, over-long, and wrong-script transcripts before scoring", () => {
    expect(gradeTranscript("zh", "放门口就行", "   ").outcome).toBe("recognition_fail");
    expect(gradeTranscript("zh", "放门口就行", "I hope you notice").outcome).toBe("recognition_fail");
    expect(gradeTranscript("en", "Leave it by the door.", "放门口就行").outcome).toBe("recognition_fail");

    const long = "放门口就行啊谢谢你帮我拿一下";
    expect(charsOf(long).length).toBeGreaterThan(2.5 * charsOf("放门口就行").length);
    const dumped = gradeTranscript("zh", "放门口就行", long);
    expect(dumped.outcome).toBe("recognition_fail");
    expect(dumped.label).toBe("");
    expect(dumped.marks).toBeNull();
  });

  it("keeps the recognition-failure copy bilingual and free of a percent", () => {
    expect(RECOGNITION_FAIL_EN).toBe("Recognition may be wrong — try Hear it, then Say it again.");
    expect(recognitionFailHeadline("en")).toContain(RECOGNITION_FAIL_EN);
    expect(recognitionFailHeadline("en")).toContain("识别可能不对");
    expect(recognitionFailHeadline("zh")).toContain(RECOGNITION_FAIL_EN);
    expect(recognitionFailHeadline("en")).not.toMatch(/%/);
    expect(micHeardLine("en", "我希望您注意到")).toBe("Mic heard: 我希望您注意到 · 麦克风听到：我希望您注意到");
    expect(micHeardLine("zh", "")).toContain("Mic heard nothing");
    expect(SHORT_ZH_MAX_CHARS).toBe(6);
    expect(isShortZhLine("zh", "放门口就行")).toBe(true);
    expect(isShortZhLine("zh", "我今天加班到七点。")).toBe(false);
    expect(isShortZhLine("en", "Leave it by the door.")).toBe(false);
    expect(SHORT_ZH_MIN_SPEECH_MS).toBeGreaterThan(MIN_SPEECH_MS);
    expect(SHORT_ZH_MIN_SPEECH_MS).toBeLessThanOrEqual(500);
  });
});
