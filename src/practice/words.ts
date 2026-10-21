import { addShanghaiDays, isShanghaiDayKey } from "./shanghai";
import { DAILY_CLEAR_GOAL } from "./streak";
import type { Lang } from "./types";
import wordsEn from "../data/words-en.json";

/**
 * Office words sit beside the English sentence packs.
 * A Shanghai day opens `DAILY_WORD_COUNT` cards: due reviews first, then new words.
 * The first clear Say it or correct meaning each day counts once toward the day streak.
 */
export const WORD_STORAGE_KEY = "echo-office-words";
export const WORD_PACK_NAME = "Office words";
export const WORD_PACK_ZH = "办公词汇";

/** Same size as the sentence day streak, so five finished words can complete the day. */
export const DAILY_WORD_COUNT = DAILY_CLEAR_GOAL;

export type OfficeWord = {
  id: string;
  /** What the card shows. */
  en: string;
  /** Short Chinese gloss. Unique in the deck so the quiz has one answer. */
  zh: string;
  example: string;
  exampleZh: string;
  /** Spoken form when the headword is an abbreviation, such as CC. */
  say?: string;
};

export type WordMemory = {
  /** 0 = introduced, not cleared yet. 1–4 = successful reviews. */
  box: number;
  /** Next day this word should return, YYYY-MM-DD in Asia/Shanghai. */
  due: string;
};

export type WordDeckState = {
  /** English pack picker is on this deck. */
  open: boolean;
  /** Ids in the order they were first put on a daily bite. */
  introduced: string[];
  memory: Record<string, WordMemory>;
  todayKey: string | null;
  todayIds: string[];
  /** Finished today by a clear Say it or the right meaning. Once each. */
  todayDone: string[];
};

export type ListedPack = {
  name: string;
  zhSet: string;
  at: number;
  count: number;
  unit?: string;
  detail?: string;
};

type StorageLike = Pick<Storage, "getItem" | "setItem"> | null;

export const officeWords = wordsEn as OfficeWord[];

const REVIEW_DAYS = [1, 2, 4, 7] as const;

export function emptyWordDeck(): WordDeckState {
  return { open: false, introduced: [], memory: {}, todayKey: null, todayIds: [], todayDone: [] };
}

/** What Hear it speaks and Say it grades. */
export function spokenOf(word: OfficeWord): string {
  const say = word.say?.trim();
  return say || word.en;
}

/** Box step after a word is finished. Box 4 stays, and the gap stretches. */
export function reviewGap(box: number): { box: number; days: number } {
  if (box >= 4) return { box: 4, days: 14 };
  const next = Math.max(1, Math.min(4, Math.floor(box) + 1));
  return { box: next, days: REVIEW_DAYS[next - 1] ?? 7 };
}

export function isTodayReady(deck: readonly OfficeWord[], state: WordDeckState, today: string, count = DAILY_WORD_COUNT): boolean {
  if (state.todayKey !== today) return false;
  if (state.todayIds.length > count) return false;
  const known = new Set(deck.map((word) => word.id));
  if (state.todayIds.some((id) => !known.has(id))) return false;
  if (deck.length === 0) return state.todayIds.length === 0;
  return state.todayIds.length === Math.min(count, deck.length);
}

/**
 * Build or reuse today's bite.
 * Due words come first (oldest due date, then the order they were introduced).
 * New words fill the rest. If the deck is already introduced and nothing is due,
 * the soonest reviews still fill the day so the bite stays the same size.
 */
export function ensureToday(
  deck: readonly OfficeWord[],
  state: WordDeckState,
  today: string,
  count = DAILY_WORD_COUNT,
): WordDeckState {
  if (isTodayReady(deck, state, today, count)) return state;
  const known = new Set(deck.map((word) => word.id));
  const introduced = state.introduced.filter((id) => known.has(id));
  const memory: WordDeckState["memory"] = {};
  for (const [id, row] of Object.entries(state.memory)) {
    if (known.has(id)) memory[id] = row;
  }
  const due = introduced
    .filter((id) => (memory[id]?.due ?? today) <= today)
    .sort((a, b) => {
      const byDue = (memory[a]?.due ?? today).localeCompare(memory[b]?.due ?? today);
      return byDue || introduced.indexOf(a) - introduced.indexOf(b);
    });
  const fresh = deck.map((word) => word.id).filter((id) => !introduced.includes(id));
  const picked: string[] = [];
  for (const id of [...due, ...fresh]) {
    if (picked.length >= count) break;
    if (!picked.includes(id)) picked.push(id);
  }
  if (picked.length < count) {
    const ahead = introduced
      .filter((id) => !picked.includes(id))
      .sort((a, b) => (memory[a]?.due ?? "9999-99-99").localeCompare(memory[b]?.due ?? "9999-99-99") || introduced.indexOf(a) - introduced.indexOf(b));
    for (const id of ahead) {
      if (picked.length >= count) break;
      picked.push(id);
    }
  }
  if (picked.length === 0) {
    if (state.todayKey === today && state.todayIds.length === 0) return state;
    return { ...state, todayKey: today, todayIds: [], todayDone: [] };
  }
  const nextIntroduced = [...introduced];
  const nextMemory = { ...memory };
  for (const id of picked) {
    if (!nextIntroduced.includes(id)) nextIntroduced.push(id);
    if (!nextMemory[id]) nextMemory[id] = { box: 0, due: today };
  }
  return {
    ...state,
    introduced: nextIntroduced,
    memory: nextMemory,
    todayKey: today,
    todayIds: picked,
    todayDone: [],
  };
}

export function markWordDone(
  state: WordDeckState,
  id: string,
  today: string,
): { state: WordDeckState; newlyDone: boolean } {
  if (!state.todayIds.includes(id) || state.todayDone.includes(id)) return { state, newlyDone: false };
  const prev = state.memory[id] ?? { box: 0, due: today };
  const step = reviewGap(prev.box);
  return {
    newlyDone: true,
    state: {
      ...state,
      todayDone: [...state.todayDone, id],
      memory: {
        ...state.memory,
        [id]: { box: step.box, due: addShanghaiDays(today, step.days) },
      },
    },
  };
}

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Three glosses for the light quiz. The answer is included. Order is stable for the day. */
export function meaningChoices(deck: readonly OfficeWord[], word: OfficeWord, today: string, take = 3): OfficeWord[] {
  const others = deck.filter((item) => item.id !== word.id);
  const picked: OfficeWord[] = [];
  if (others.length > 0) {
    const start = hash(`${today}:${word.id}`) % others.length;
    for (let i = 0; i < others.length && picked.length < take - 1; i += 1) {
      picked.push(others[(start + i) % others.length]);
    }
  }
  const merged = [word, ...picked];
  const order = hash(`${today}:${word.id}:order`);
  return merged
    .map((item, index) => ({ item, key: (order + index * 17) % 97 }))
    .sort((a, b) => a.key - b.key || a.item.id.localeCompare(b.item.id))
    .map((row) => row.item);
}

function isId(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function loadWordDeck(storage: Pick<Storage, "getItem"> | null): WordDeckState {
  if (!storage) return emptyWordDeck();
  try {
    const raw = storage.getItem(WORD_STORAGE_KEY);
    if (!raw) return emptyWordDeck();
    const parsed = JSON.parse(raw) as Partial<WordDeckState>;
    const introduced = Array.isArray(parsed.introduced) ? [...new Set(parsed.introduced.filter(isId))] : [];
    const memory: WordDeckState["memory"] = {};
    if (parsed.memory && typeof parsed.memory === "object") {
      for (const [id, row] of Object.entries(parsed.memory as Record<string, unknown>)) {
        if (!isId(id) || !row || typeof row !== "object") continue;
        const box = Number((row as { box?: unknown }).box);
        const due = (row as { due?: unknown }).due;
        memory[id] = {
          box: Number.isFinite(box) && box > 0 ? Math.min(4, Math.floor(box)) : 0,
          due: typeof due === "string" && isShanghaiDayKey(due) ? due : "1970-01-01",
        };
      }
    }
    const todayKey = typeof parsed.todayKey === "string" && isShanghaiDayKey(parsed.todayKey) ? parsed.todayKey : null;
    const todayIds = Array.isArray(parsed.todayIds) ? parsed.todayIds.filter(isId) : [];
    const todayDone = Array.isArray(parsed.todayDone) ? parsed.todayDone.filter((id) => isId(id) && todayIds.includes(id)) : [];
    return { open: parsed.open === true, introduced, memory, todayKey, todayIds, todayDone };
  } catch {
    return emptyWordDeck();
  }
}

/** Skip a write until the learner has actually opened the word deck. */
export function shouldPersistWordDeck(state: WordDeckState): boolean {
  return state.open || state.introduced.length > 0 || Boolean(state.todayKey);
}

export function saveWordDeck(storage: StorageLike, state: WordDeckState): void {
  if (!storage) return;
  try {
    storage.setItem(WORD_STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* private mode */
  }
}

/** Sentence groups, plus the Office words tile at the top of English. */
export function practicePacks(lang: Lang, pack: readonly { set: string; zhSet: string }[]): ListedPack[] {
  const names: string[] = [];
  for (const row of pack) {
    if (!names.includes(row.set)) names.push(row.set);
  }
  const sets = names.map((name) => {
    const first = pack.find((row) => row.set === name)!;
    const at = pack.findIndex((row) => row.set === name);
    let count = 0;
    for (const row of pack) if (row.set === name) count += 1;
    return { name, zhSet: first.zhSet, at, count };
  });
  if (lang !== "en") return sets;
  return [
    {
      name: WORD_PACK_NAME,
      zhSet: WORD_PACK_ZH,
      at: -1,
      count: officeWords.length,
      unit: "词",
      detail: `每天 ${DAILY_WORD_COUNT} · ${officeWords.length} 词`,
    },
    ...sets,
  ];
}

/** Empty when the deck is a usable daily set. Shown with the sentence pack check. */
export function wordDeckIssues(deck: readonly OfficeWord[]): string {
  const err: string[] = [];
  if (deck.length < 30 || deck.length > 50) err.push(`Office words is ${deck.length}`);
  const ids = new Set<string>();
  const glosses = new Set<string>();
  const heads = new Set<string>();
  for (const word of deck) {
    if (!/^[a-z0-9-]+$/.test(word.id)) err.push(`bad id ${word.id}`);
    if (ids.has(word.id)) err.push(`duplicate id ${word.id}`);
    ids.add(word.id);
    const head = word.en.trim().toLowerCase();
    if (!head) err.push(`empty en ${word.id}`);
    if (heads.has(head)) err.push(`duplicate en ${word.en}`);
    heads.add(head);
    const gloss = word.zh.trim();
    if (!gloss) err.push(`empty zh ${word.id}`);
    if (glosses.has(gloss)) err.push(`duplicate zh ${gloss}`);
    glosses.add(gloss);
    if (!word.example.trim() || !word.exampleZh.trim()) err.push(`missing example ${word.id}`);
    if (word.say !== undefined && !word.say.trim()) err.push(`empty say ${word.id}`);
  }
  return err.join("; ");
}
