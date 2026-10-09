import { describe, expect, it } from "vitest";
import { charsOf, gradeTranscript, wordsOf } from "../src/practice/score";

describe("word and character scoring", () => {
  it("counts English words and does not invent a percent", () => {
    const graded = gradeTranscript("en", "The printer seems out of paper.", "the printer seems out");
    expect(wordsOf("The printer seems out of paper.")).toEqual(["the", "printer", "seems", "out", "of", "paper"]);
    expect(graded.good).toBe(4);
    expect(graded.total).toBe(6);
    expect(graded.label).toBe("4 of 6 words");
    expect(graded.label).not.toMatch(/%/);
    expect(graded.marks).toEqual([true, true, true, true, false, false]);
  });

  it("counts Chinese characters", () => {
    const graded = gradeTranscript("zh", "我今天加班到七点。", "我今天加班");
    expect(charsOf("我今天加班到七点。")).toEqual(["我", "今", "天", "加", "班", "到", "七", "点"]);
    expect(graded.label).toBe("5 of 8 字");
    expect(graded.label).not.toMatch(/%/);
  });
});
