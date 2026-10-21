import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ModeNav } from "../src/components/ModeNav";
import { PracticePanel } from "../src/components/PracticePanel";
import { WordCard } from "../src/components/WordCard";
import { PackPicker } from "../src/components/PackPicker";
import { emptySession } from "../src/practice/session";
import { shanghaiDateKey } from "../src/practice/shanghai";
import type { Sentence } from "../src/practice/types";
import { DAILY_WORD_COUNT, WORD_PACK_NAME, WORD_PACK_ZH, WORD_STORAGE_KEY, meaningChoices, officeWords, practicePacks, wordDecksFor } from "../src/practice/words";

const line: Sentence = {
  set: "Office",
  zhSet: "办公室",
  en: "The printer seems out of paper.",
  zh: "打印机好像没纸了。",
};

function memory(initial?: Record<string, string>): Storage {
  const map = new Map(Object.entries(initial ?? {}));
  return {
    get length() {
      return map.size;
    },
    clear() {
      map.clear();
    },
    getItem(key: string) {
      return map.has(key) ? map.get(key)! : null;
    },
    key(index: number) {
      return [...map.keys()][index] ?? null;
    },
    removeItem(key: string) {
      map.delete(key);
    },
    setItem(key: string, value: string) {
      map.set(key, String(value));
    },
  };
}

function panel(overrides: Record<string, unknown> = {}): string {
  return renderToStaticMarkup(
    createElement(PracticePanel, {
      lang: "en",
      index: 0,
      item: line,
      pack: [line],
      marks: null,
      outcome: "idle",
      heardPreview: "",
      kicker: "Practice",
      heard: "",
      score: "",
      modelNote: "",
      listening: false,
      error: "",
      jump: () => undefined,
      jumpTo: () => undefined,
      hear: () => undefined,
      sayIt: () => undefined,
      pace: "normal",
      setPace: () => undefined,
      session: emptySession(),
      lineOutcome: null,
      resetSession: () => undefined,
      ...overrides,
    } as never),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("office word card", () => {
  const word = officeWords[0];
  const choices = meaningChoices(officeWords, word, "2026-10-21");

  it("shows the English word and a short meaning quiz until the card is flipped", () => {
    const front = renderToStaticMarkup(
      createElement(WordCard, {
        index: 0,
        count: 5,
        word,
        flipped: false,
        done: false,
        choices,
        onFlip: () => undefined,
        onPick: () => undefined,
        onJump: () => undefined,
      }),
    );
    expect(front).toContain(word.en);
    expect(front).toContain('id="word-quiz"');
    expect(front).toContain('id="word-flip"');
    expect(front).toContain("Flip · 看意思");
    expect(front).not.toContain(word.exampleZh);
    expect(front.match(/<button/g)?.length).toBeGreaterThanOrEqual(choices.length);

    const back = renderToStaticMarkup(
      createElement(WordCard, {
        index: 0,
        count: 5,
        word,
        flipped: true,
        done: true,
        choices,
        onFlip: () => undefined,
        onPick: () => undefined,
        onJump: () => undefined,
      }),
    );
    expect(back).toContain(word.zh);
    expect(back).toContain(word.example);
    expect(back).toContain(word.exampleZh);
    expect(back).not.toContain('id="word-quiz"');
    expect(back).toContain("Show the word · 看单词");
  });

  it("keeps Office words out of the sentence pack picker", () => {
    const html = renderToStaticMarkup(
      createElement(PackPicker, {
        lang: "en",
        active: line.set,
        sets: practicePacks([line]),
        onSelect: () => undefined,
      }),
    );
    expect(html).not.toContain(WORD_PACK_NAME);
    expect(html).not.toContain(WORD_PACK_ZH);
    expect(html).toContain("1 句");
    expect(html).toContain(line.zhSet);
    expect(html).not.toContain(line.en);
  });

  it("lists Office words in the Word decks menu, and hides that tab in Chinese", () => {
    const open = renderToStaticMarkup(
      createElement(ModeNav, {
        mode: "words",
        decks: wordDecksFor("en"),
        deckId: "office",
        onChange: () => undefined,
        onPickDeck: () => undefined,
      }),
    );
    expect(open.indexOf('id="mode-translate"')).toBeLessThan(open.indexOf('id="mode-practice"'));
    expect(open.indexOf('id="mode-practice"')).toBeLessThan(open.indexOf('id="mode-words"'));
    expect(open).toContain(">Word decks<");
    expect(open).toContain(">单词卡<");
    expect(open).toContain('aria-haspopup="menu"');
    expect(open).toContain('id="word-deck-office"');
    expect(open).toContain(WORD_PACK_NAME);
    expect(open).toContain(WORD_PACK_ZH);
    expect(open).toContain('aria-checked="true"');
    expect(open).toContain('hidden=""');

    const chinese = renderToStaticMarkup(
      createElement(ModeNav, {
        mode: "practice",
        decks: wordDecksFor("zh"),
        onChange: () => undefined,
      }),
    );
    expect(chinese).not.toContain('id="mode-words"');
    expect(chinese).not.toContain(WORD_PACK_NAME);
  });
});

describe("daily word practice", () => {
  it("keeps sentence practice when the word deck is closed", () => {
    vi.stubGlobal("localStorage", memory());
    const html = panel();
    expect(html).toContain(">printer</span>");
    expect(html).toContain(line.zh);
    expect(html).toContain('id="hear"');
    expect(html).toContain('id="say"');
    expect(html).not.toContain('id="word-day"');
    expect(html).not.toContain('id="word-quiz"');
  });

  it("does not open Office words from a saved deck while Practice is showing sentences", () => {
    const today = shanghaiDateKey(new Date());
    const ids = officeWords.slice(0, DAILY_WORD_COUNT).map((word) => word.id);
    vi.stubGlobal(
      "localStorage",
      memory({
        [WORD_STORAGE_KEY]: JSON.stringify({
          open: true,
          introduced: ids,
          memory: Object.fromEntries(ids.map((id) => [id, { box: 0, due: today }])),
          todayKey: today,
          todayIds: ids,
          todayDone: [],
        }),
      }),
    );
    const html = panel();
    expect(html).toContain(">printer</span>");
    expect(html).toContain('id="pack-toggle"');
    expect(html).toContain("Packs");
    expect(html).not.toContain('id="word-quiz"');
    expect(html).not.toContain(WORD_PACK_NAME);
    expect(html).not.toContain(WORD_PACK_ZH);
  });

  it("shows today's five words, Hear it, and Say it", () => {
    const today = shanghaiDateKey(new Date());
    const ids = officeWords.slice(0, DAILY_WORD_COUNT).map((word) => word.id);
    const storage = memory({
      [WORD_STORAGE_KEY]: JSON.stringify({
        open: true,
        introduced: ids,
        memory: Object.fromEntries(ids.map((id) => [id, { box: 0, due: today }])),
        todayKey: today,
        todayIds: ids,
        todayDone: [ids[0]],
      }),
    });
    vi.stubGlobal("localStorage", storage);
    const html = panel({ wordDeck: true });
    expect(html).toContain("Office words");
    expect(html).not.toContain('id="pack-toggle"');
    expect(html).not.toContain("Packs · 选一组");
    expect(html).toContain("办公词汇");
    expect(html).toContain(officeWords[1].en);
    expect(html).not.toContain(officeWords[0].example);
    expect(html).toContain('id="word-day"');
    expect(html).toContain('id="word-quiz"');
    expect(html).toContain('id="hear"');
    expect(html).toContain('id="say"');
    expect(html).toContain(`1/${DAILY_WORD_COUNT}`);
    expect(html).toContain("2 / 5");
    expect(html).not.toContain("is-right");
    expect(html).not.toContain(line.en);
    expect(html).not.toContain(officeWords[1].exampleZh);
    expect(html.match(/class="word-pips"[\s\S]*?<\/span>/)?.[0].match(/<i/g)).toHaveLength(DAILY_WORD_COUNT);
  });
});
