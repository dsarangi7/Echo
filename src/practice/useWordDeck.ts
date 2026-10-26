import { useCallback, useEffect, useRef, useState } from "react";
import { playVictory } from "../speech/victory";
import { shanghaiDateKey } from "./shanghai";
import { practiceLocalStorage, recordClearMatch } from "./streak";
import {
  ensureToday,
  isTodayReady,
  loadWordDeck,
  markWordDone,
  officeWords,
  saveWordDeck,
  shouldPersistWordDeck,
  type OfficeWord,
  type WordDeckState,
} from "./words";
import type { Lang } from "./types";

function firstUndone(state: WordDeckState): number {
  const idx = state.todayIds.findIndex((id) => !state.todayDone.includes(id));
  return idx < 0 ? 0 : idx;
}

/** Show today's bite when Word decks mode is on. Otherwise leave the saved deck closed. */
function presentedDeck(deck: WordDeckState, want: boolean, today: string): WordDeckState {
  if (!want) return deck.open ? { ...deck, open: false } : deck;
  const base = deck.open ? deck : { ...deck, open: true };
  if (isTodayReady(officeWords, base, today)) return base;
  return ensureToday(officeWords, base, today);
}

/**
 * Daily Office words for the English Word decks mode.
 * Chinese family decks do not use this bite. Sentence practice passes `enabled` false.
 */
export function useWordDeck(lang: Lang, enabled = false) {
  const [deck, setDeck] = useState<WordDeckState>(() => loadWordDeck(practiceLocalStorage()));
  const [cursor, setCursor] = useState(() => firstUndone(loadWordDeck(practiceLocalStorage())));
  const [flipped, setFlipped] = useState(false);
  const deckRef = useRef(deck);
  const counted = useRef(new Set<string>());

  const today = shanghaiDateKey(new Date());
  const want = enabled && lang === "en";
  const live = presentedDeck(deck, want, today);
  if (live !== deck) {
    const justOpened = want && !deck.open;
    setDeck(live);
    if (!want) {
      setFlipped(false);
    } else if (justOpened) {
      const idx = live.todayIds.findIndex((id) => !live.todayDone.includes(id));
      setCursor(idx < 0 ? 0 : idx);
      setFlipped(false);
    } else {
      setCursor(0);
      setFlipped(false);
    }
  }
  deckRef.current = live;

  useEffect(() => {
    if (!shouldPersistWordDeck(deck)) return;
    saveWordDeck(practiceLocalStorage(), deck);
  }, [deck]);

  const wordMode = want && live.open;
  const words: OfficeWord[] = [];
  if (wordMode) {
    const byId = new Map(officeWords.map((word) => [word.id, word]));
    for (const id of live.todayIds) {
      const word = byId.get(id);
      if (word) words.push(word);
    }
  }
  const safeCursor = words.length === 0 ? 0 : Math.min(Math.max(0, cursor), words.length - 1);
  const word = words[safeCursor] ?? null;
  const doneCount = live.todayDone.filter((id) => live.todayIds.includes(id)).length;

  const openPack = useCallback(() => {
    const day = shanghaiDateKey(new Date());
    const next = ensureToday(officeWords, { ...deckRef.current, open: true }, day);
    deckRef.current = next;
    setDeck(next);
    const idx = next.todayIds.findIndex((id) => !next.todayDone.includes(id));
    setCursor(idx < 0 ? 0 : idx);
    setFlipped(false);
  }, []);

  const closePack = useCallback(() => {
    if (!deckRef.current.open) return;
    const next = { ...deckRef.current, open: false };
    deckRef.current = next;
    setDeck(next);
    setFlipped(false);
  }, []);

  const move = useCallback((delta: -1 | 1) => {
    const n = deckRef.current.todayIds.length;
    if (n < 2) return;
    setCursor((prev) => (prev + delta + n) % n);
    setFlipped(false);
  }, []);

  const finish = useCallback((id: string, sound: boolean) => {
    const day = shanghaiDateKey(new Date());
    const token = `${day}:${id}`;
    if (counted.current.has(token)) return;
    const result = markWordDone(deckRef.current, id, day);
    counted.current.add(token);
    if (!result.newlyDone) return;
    deckRef.current = result.state;
    setDeck(result.state);
    recordClearMatch(practiceLocalStorage(), new Date());
    if (sound) playVictory();
  }, []);

  return {
    wordMode,
    words,
    word,
    cursor: safeCursor,
    flipped,
    setFlipped,
    doneCount,
    openPack,
    closePack,
    move,
    finish,
    todayKey: live.todayKey,
    doneIds: live.todayDone,
  };
}
