import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TargetSentence } from "../src/components/TargetSentence";
import { pinyinMarkCount, pinyinPieces, readingText } from "../src/practice/pinyin";

describe("pinyin reading", () => {
  it("shows pinyin for Chinese and leaves English text alone", () => {
    const item = { en: "I called you.", zh: "师傅，我打你电话了。", py: "Shī fu, wǒ dǎ nǐ diàn huà le." };
    expect(readingText("zh", item)).toBe(item.py);
    expect(readingText("en", item)).toBe(item.en);
    expect(readingText("en", { ...item, py: "should not appear" })).toBe("I called you.");
    expect(readingText("zh", { en: item.en, zh: item.zh })).toBe(item.zh);
  });

  it("counts zhèr as two characters and keeps punctuation unscored", () => {
    const pieces = pinyinPieces("Shī fu, zhèr tíng.");
    expect(pieces.filter((piece) => piece.marks > 0).map((piece) => [piece.text, piece.marks])).toEqual([
      ["Shī", 1],
      ["fu", 1],
      ["zhèr", 2],
      ["tíng", 1],
    ]);
    expect(pinyinMarkCount("Shī fu, zhèr tíng.")).toBe(5);
  });

  it("paints pinyin syllables from character marks and keeps a hanzi fallback", () => {
    const pinyin = renderToStaticMarkup(
      createElement(TargetSentence, {
        lang: "zh",
        text: "Shī fu, zhèr tíng.",
        marks: [true, false, true, true, false],
      }),
    );
    expect(pinyin).toContain('lang="zh-Latn"');
    expect(pinyin).toContain('class="ok">Shī');
    expect(pinyin).toContain('class="bad">fu');
    expect(pinyin).toContain('class="ok">zhèr');
    expect(pinyin).toContain('class="bad">tíng');
    expect(pinyin).not.toContain('class="ok">,');

    const unsure = renderToStaticMarkup(
      createElement(TargetSentence, {
        lang: "zh",
        text: "Wǒ zài jiā.",
        marks: null,
        unrecognized: true,
      }),
    );
    expect(unsure).toContain('data-tone="unsure"');
    expect(unsure).toContain('class="unk">Wǒ');

    const hanzi = renderToStaticMarkup(
      createElement(TargetSentence, { lang: "zh", text: "你好", marks: [true, false] }),
    );
    expect(hanzi).toContain('lang="zh-CN"');
    expect(hanzi).toContain('class="ok">你');
    expect(hanzi).toContain('class="bad">好');
  });

  it("keeps Hear it and Say it on the characters", () => {
    const practice = readFileSync("src/practice/usePractice.ts", "utf8");
    expect(practice).toMatch(/function primaryText\(lang: Lang, item: Sentence\): string \{\s*return lang === "en" \? item\.en : item\.zh;/);
    expect(practice).not.toContain("item.py");
    expect(practice).not.toContain("readingText");

    const panel = readFileSync("src/components/PracticePanel.tsx", "utf8");
    expect(panel).toContain("readingText(lang, item)");
    expect(panel).not.toContain("lang === \"en\" ? item.en : item.zh");

    const speech = readFileSync("src/speech/tts.ts", "utf8");
    expect(speech).toContain("introLine(lang)");
    expect(speech).not.toContain("introReading");

    const app = readFileSync("src/App.tsx", "utf8");
    expect(app).toContain("introReading(lang)");
    expect(app).toContain('lang === "en" ? "zh" : "en"');
  });
});
