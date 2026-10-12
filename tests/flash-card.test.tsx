import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PackPicker } from "../src/components/PackPicker";
import { PracticePanel } from "../src/components/PracticePanel";
import { CARD_TONES, cardTone, directionWithin, stepWithinSet, swipeDecision } from "../src/practice/cards";
import { emptySession } from "../src/practice/session";
import type { Sentence } from "../src/practice/types";

const taxi: Sentence = { set: "Taxi / Didi", zhSet: "打车", en: "I called you.", zh: "师傅，我打你电话了。" };
const taxiNext: Sentence = { set: "Taxi / Didi", zhSet: "打车", en: "Please wait here.", zh: "请在这儿等我。" };
const rider: Sentence = { set: "Rider phrases", zhSet: "外卖骑手", en: "Food is here.", zh: "外卖到了，下楼取。" };

function panel(overrides: Record<string, unknown> = {}): string {
  return renderToStaticMarkup(
    createElement(PracticePanel, {
      lang: "zh",
      index: 0,
      item: taxi,
      pack: [taxi, taxiNext, rider],
      marks: null,
      outcome: "idle",
      heardPreview: "",
      kicker: "Practice",
      heard: "点「听一听」，再点「说一说」。",
      score: "",
      modelNote: "",
      listening: false,
      error: "",
      jump: () => undefined,
      jumpTo: () => undefined,
      hear: () => undefined,
      sayIt: () => undefined,
      pace: "slow",
      setPace: () => undefined,
      session: emptySession(),
      lineOutcome: null,
      resetSession: () => undefined,
      ...overrides,
    } as never),
  );
}

describe("card tones", () => {
  it("rotates a calm paper palette so neighbors differ", () => {
    expect(CARD_TONES.length).toBeGreaterThanOrEqual(6);
    const ids = CARD_TONES.map((tone) => tone.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (let i = 0; i < CARD_TONES.length; i += 1) {
      expect(cardTone(i).id).toBe(CARD_TONES[i].id);
      expect(cardTone(i).bg).not.toBe(cardTone(i + 1).bg);
      expect(cardTone(i).bg).toBe(cardTone(i + CARD_TONES.length).bg);
    }
    expect(cardTone(-1).id).toBe(CARD_TONES[CARD_TONES.length - 1].id);
  });
});

describe("pack steps", () => {
  const pack = [taxi, taxiNext, rider];

  it("wraps inside the open pack and does not walk into the next one", () => {
    expect(stepWithinSet(pack, 0, 1)).toBe(1);
    expect(stepWithinSet(pack, 1, 1)).toBe(0);
    expect(stepWithinSet(pack, 1, -1)).toBe(0);
    expect(stepWithinSet(pack, 0, -1)).toBe(1);
    expect(stepWithinSet(pack, 2, 1)).toBe(2);
    expect(stepWithinSet(pack, 2, -1)).toBe(2);
    expect(directionWithin(0, 2, 1, 0)).toBe(1);
    expect(directionWithin(0, 2, 0, 1)).toBe(1);
    expect(directionWithin(0, 2, 1, 0)).toBe(1);
    expect(directionWithin(2, 1, 0, 2)).toBe(1);
  });
});

describe("swipe", () => {
  it("treats a horizontal drag as next or previous and ignores a scroll", () => {
    expect(swipeDecision(-80, 4, 320)).toBe(1);
    expect(swipeDecision(80, -6, 320)).toBe(-1);
    expect(swipeDecision(-30, 0, 320)).toBe(0);
    expect(swipeDecision(-70, 90, 320)).toBe(0);
    expect(swipeDecision(0, 40, 320)).toBe(0);
    expect(swipeDecision(Number.NaN, 0, 320)).toBe(0);
  });
});

describe("flash card practice", () => {
  it("shows one sentence and keeps hear, say, and pace off a wall of lines", () => {
    const html = panel();
    expect(html).toContain('data-card-tone="wheat"');
    expect(html).toContain("<span>师</span><span>傅</span><span>，</span><span>我</span><span>打</span><span>你</span><span>电</span><span>话</span><span>了</span>");
    expect(html).toContain("I called you.");
    expect(html).not.toContain("请在这儿等我。");
    expect(html).not.toContain("外卖到了，下楼取。");
    expect(html).not.toContain("外卖骑手");
    expect(html).toContain('id="prev"');
    expect(html).toContain('id="next"');
    expect(html).toContain('id="hear"');
    expect(html).toContain('id="say"');
    expect(html).toContain('id="pace-slow"');
    expect(html).toContain('id="legend-score"');
    expect(html).toContain("arrow keys change the sentence");
    expect(html).toMatch(/id="progress">\s*1 \/ 3\s*</);
    expect(html).toContain('id="streak-strip"');
    expect(html.indexOf('id="streak-strip"')).toBeLessThan(html.indexOf('id="session-strip"'));

    const second = panel({ lang: "en", index: 1, item: taxiNext });
    expect(second).toContain('data-card-tone="sage"');
    expect(second).toContain(">Please</span>");
    expect(second).toContain(">wait</span>");
    expect(second).toContain("请在这儿等我。");
    expect(second).not.toContain("<span>师</span><span>傅</span>");
    expect(second).not.toContain("外卖到了，下楼取。");
  });

  it("lists pack names without their sentences", () => {
    const html = renderToStaticMarkup(
      createElement(PackPicker, {
        lang: "zh",
        active: taxi.set,
        sets: [
          { name: taxi.set, zhSet: taxi.zhSet, at: 0, count: 2 },
          { name: rider.set, zhSet: rider.zhSet, at: 2, count: 1 },
        ],
        onSelect: () => undefined,
      }),
    );
    expect(html).toContain("打车");
    expect(html).toContain("外卖骑手");
    expect(html).toContain("2 句");
    expect(html).not.toContain(taxi.zh);
    expect(html).not.toContain(rider.zh);
    expect(html).not.toContain(taxi.en);
  });

  it("keeps arrow keys on the practice card, inside the open pack", () => {
    const panelSrc = readFileSync("src/components/PracticePanel.tsx", "utf8");
    const app = readFileSync("src/App.tsx", "utf8");
    const hook = readFileSync("src/practice/usePractice.ts", "utf8");
    expect(panelSrc).toContain("ArrowRight");
    expect(panelSrc).toContain("stepPack");
    expect(app).not.toContain("ArrowRight");
    expect(hook).toContain("stepWithinSet");
  });
});
