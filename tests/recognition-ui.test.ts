import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PracticePanel } from "../src/components/PracticePanel";
import { TargetSentence } from "../src/components/TargetSentence";
import { recognitionFailHeadline } from "../src/practice/score";

const item = { set: "Door", zhSet: "门口", en: "Leave it by the door.", zh: "放门口就行" };

function panel(overrides: Record<string, unknown>): string {
  return renderToStaticMarkup(
    createElement(PracticePanel, {
      lang: "zh",
      index: 0,
      item,
      pack: [item],
      marks: null,
      outcome: "idle",
      heardPreview: "",
      catMode: "idle",
      mouth: 0,
      kicker: "Practice",
      heard: "",
      score: "",
      modelNote: "",
      listening: false,
      error: "",
      setLanguage: () => undefined,
      introduce: () => undefined,
      jump: () => undefined,
      jumpTo: () => undefined,
      hear: () => undefined,
      sayIt: () => undefined,
      ...overrides,
    } as never),
  );
}

describe("recognition failure UI", () => {
  it("does not paint the target wrong or show 0 of N", () => {
    const html = panel({
      outcome: "recognition_fail",
      kicker: "识别",
      heard: recognitionFailHeadline("zh"),
      heardPreview: "我希望您注意到",
      score: "0 of 5 字",
    });
    expect(html).toContain("Recognition may be wrong — try Hear it, then Say it again.");
    expect(html).toContain("识别可能不对——先听一听，再说一次。");
    expect(html).toContain("麦克风听到：我希望您注意到");
    expect(html).toContain("Try again");
    expect(html).toContain("再说一次");
    expect(html).toContain("Hear it");
    expect(html).toContain('class="unk"');
    expect(html).not.toContain('class="bad"');
    expect(html).not.toContain('class="ok"');
    expect(html).not.toContain("0 of 5");
    expect(html).not.toContain('id="score"');
    expect(html).not.toMatch(/%/);
  });

  it("still paints exact word and character matches when recognition is on target", () => {
    const html = panel({
      lang: "en",
      outcome: "scored",
      marks: [true, true, false],
      kicker: "Heard",
      heard: "leave it",
      score: "2 of 3 words",
      item: { ...item, en: "Leave it here" },
      pack: [item],
    });
    expect(html).toContain('class="ok"');
    expect(html).toContain('class="bad"');
    expect(html).toContain("2 of 3 words");
    expect(html).not.toContain("Try again");
    expect(html).not.toContain('class="unk"');
  });

  it("leaves the target unmarked before a recording", () => {
    const html = renderToStaticMarkup(createElement(TargetSentence, { lang: "zh", text: "放门口就行", marks: null }));
    expect(html).toContain("<span>放</span><span>门</span><span>口</span><span>就</span><span>行</span>");
    expect(html).not.toContain('class="bad"');
    expect(html).not.toContain('class="unk"');
  });
});