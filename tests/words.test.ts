import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { addShanghaiDays } from "../src/practice/shanghai";
import {
  DAILY_WORD_COUNT,
  WORD_PACK_NAME,
  emptyWordDeck,
  ensureToday,
  loadWordDeck,
  markWordDone,
  shouldPersistWordDeck,
  meaningChoices,
  officeWords,
  practicePacks,
  reviewGap,
  wordDecksFor,
  saveWordDeck,
  spokenOf,
  wordDeckIssues,
  type OfficeWord,
  type WordDeckState,
} from "../src/practice/words";

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

function fixture(n = 7): OfficeWord[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `w${i + 1}`,
    en: `word ${i + 1}`,
    zh: `词${i + 1}`,
    example: `Example ${i + 1}.`,
    exampleZh: `例句${i + 1}。`,
  }));
}

describe("office word deck", () => {
  it("is a practical English office set with unique glosses", () => {
    expect(officeWords.length).toBeGreaterThanOrEqual(40);
    expect(officeWords.length).toBeLessThanOrEqual(50);
    expect(wordDeckIssues(officeWords)).toBe("");
    expect(DAILY_WORD_COUNT).toBe(5);
    const byId = new Map(officeWords.map((word) => [word.id, word]));
    for (const id of ["meeting", "deadline", "overtime", "leave", "cc", "battery", "rd"]) {
      expect(byId.has(id), id).toBe(true);
    }
    expect(spokenOf(byId.get("cc")!)).toBe("carbon copy");
    expect(spokenOf(byId.get("rd")!)).toBe("research and development");
    expect(spokenOf(byId.get("deadline")!)).toBe("deadline");
    expect(byId.get("cc")!.zh).toBe("抄送");
    expect(officeWords.every((word) => word.en.split(/\s+/).length <= 4)).toBe(true);
  });

  it("keeps word decks out of the sentence pack list", () => {
    const sentences = [
      { set: "Office", zhSet: "办公室" },
      { set: "Office", zhSet: "办公室" },
      { set: "Meetings", zhSet: "开会" },
    ];
    expect(practicePacks(sentences).map((set) => [set.name, set.count])).toEqual([
      ["Office", 2],
      ["Meetings", 1],
    ]);
    expect(practicePacks(sentences).some((set) => set.name === WORD_PACK_NAME)).toBe(false);
    expect(wordDecksFor("en")).toEqual([{ id: "office", name: WORD_PACK_NAME, zh: "办公词汇", lang: "en" }]);
    expect(wordDecksFor("zh")).toEqual([]);
  });
});

describe("daily office words", () => {
  const today = "2026-10-21";
  const deck = fixture();

  it("opens five new words and keeps that bite for the day", () => {
    const first = ensureToday(deck, emptyWordDeck(), today);
    expect(first.todayIds).toEqual(["w1", "w2", "w3", "w4", "w5"]);
    expect(first.introduced).toEqual(first.todayIds);
    expect(first.todayDone).toEqual([]);
    expect(first.memory.w1).toEqual({ box: 0, due: today });
    expect(ensureToday(deck, first, today)).toBe(first);
  });

  it("brings unfinished words back before new ones", () => {
    const first = ensureToday(deck, emptyWordDeck(), today);
    const done = markWordDone(first, "w1", today);
    expect(done.newlyDone).toBe(true);
    expect(done.state.todayDone).toEqual(["w1"]);
    expect(done.state.memory.w1).toEqual({ box: 1, due: addShanghaiDays(today, 1) });
    expect(markWordDone(done.state, "w1", today).newlyDone).toBe(false);

    const tomorrow = addShanghaiDays(today, 1);
    const next = ensureToday(deck, done.state, tomorrow);
    expect(next.todayIds).toEqual(["w2", "w3", "w4", "w5", "w1"]);
    expect(next.todayDone).toEqual([]);
    expect(next.introduced).not.toContain("w6");
  });

  it("offers five new words once the previous five are scheduled ahead", () => {
    const wide = fixture(12);
    let state = ensureToday(wide, emptyWordDeck(), today);
    for (const id of state.todayIds) state = markWordDone(state, id, today).state;
    const reviewDay = addShanghaiDays(today, 1);
    expect(ensureToday(wide, state, reviewDay).todayIds).toEqual(["w1", "w2", "w3", "w4", "w5"]);
    let reviewed = ensureToday(wide, state, reviewDay);
    for (const id of reviewed.todayIds) reviewed = markWordDone(reviewed, id, reviewDay).state;
    const freshDay = addShanghaiDays(reviewDay, 1);
    expect(ensureToday(wide, reviewed, freshDay).todayIds).toEqual(["w6", "w7", "w8", "w9", "w10"]);
  });

  it("still fills five from the soonest reviews when nothing is due", () => {
    const ids = deck.map((word) => word.id);
    const state: WordDeckState = {
      open: true,
      introduced: ids,
      memory: Object.fromEntries(ids.map((id, i) => [id, { box: 2, due: addShanghaiDays(today, 3 + i) }])),
      todayKey: null,
      todayIds: [],
      todayDone: [],
    };
    expect(ensureToday(deck, state, today).todayIds).toEqual(["w1", "w2", "w3", "w4", "w5"]);
    expect(ensureToday(deck, state, today).memory.w1.box).toBe(2);
  });

  it("spaces reviews out as a word is cleared again", () => {
    expect(reviewGap(0)).toEqual({ box: 1, days: 1 });
    expect(reviewGap(1)).toEqual({ box: 2, days: 2 });
    expect(reviewGap(2)).toEqual({ box: 3, days: 4 });
    expect(reviewGap(3)).toEqual({ box: 4, days: 7 });
    expect(reviewGap(4)).toEqual({ box: 4, days: 14 });
  });

  it("offers three stable meanings, including the answer", () => {
    const word = deck[0];
    const first = meaningChoices(deck, word, today).map((item) => item.id);
    const again = meaningChoices(deck, word, today).map((item) => item.id);
    expect(first).toEqual(again);
    expect(first).toHaveLength(3);
    expect(new Set(first).size).toBe(3);
    expect(first).toContain(word.id);
  });

  it("remembers the deck and ignores a broken save", () => {
    const storage = memory();
    const state = ensureToday(deck, { ...emptyWordDeck(), open: true }, today);
    saveWordDeck(storage, state);
    expect(loadWordDeck(storage).todayIds).toEqual(state.todayIds);
    expect(loadWordDeck(storage).open).toBe(true);
    storage.setItem("echo-office-words", "{");
    expect(loadWordDeck(storage)).toEqual(emptyWordDeck());
    expect(loadWordDeck(null)).toEqual(emptyWordDeck());
    expect(shouldPersistWordDeck(emptyWordDeck())).toBe(false);
    expect(shouldPersistWordDeck(state)).toBe(true);
    expect(shouldPersistWordDeck({ ...state, open: false })).toBe(true);
  });
});

describe("word practice wiring", () => {
  it("speaks words with the device voice and lets the deck own the streak point", () => {
    const hook = readFileSync("src/practice/usePractice.ts", "utf8");
    expect(hook).toContain('speakPlain');
    expect(hook).toContain("if (!ownStreakRef.current) recordClearMatch");
    const panel = readFileSync("src/components/PracticePanel.tsx", "utf8");
    expect(panel).toContain("useWordDeck");
    expect(panel).toContain('speak: "plain"');
    expect(panel).not.toMatch(/\blocalStorage\b/);
    expect(panel).not.toContain("recordPracticeClearOrPartial");
    expect(panel).not.toContain("openPack");
    expect(panel).not.toContain("closePack");
    const app = readFileSync("src/App.tsx", "utf8");
    expect(app).toContain("wordDecksFor");
    expect(app).toContain('wordDeck={shownMode === "words"}');
    const nav = readFileSync("src/components/ModeNav.tsx", "utf8");
    const translateAt = nav.indexOf('id="mode-translate"');
    const practiceAt = nav.indexOf('id="mode-practice"');
    const wordsAt = nav.indexOf('id="mode-words"');
    expect(translateAt).toBeGreaterThan(-1);
    expect(translateAt).toBeLessThan(practiceAt);
    expect(practiceAt).toBeLessThan(wordsAt);
  });
});
