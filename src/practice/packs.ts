import type { Sentence } from "./types";
import packEnJson from "../data/pack-en.json";
import packZhJson from "../data/pack-zh.json";
import { familyIssues, familyLessons } from "./families";
import { WORD_DECKS, officeWords, wordDeckIssues } from "./words";

export const packEn = packEnJson as Sentence[];
export const packZh = packZhJson as Sentence[];

export const packs = {
  en: packEn,
  zh: packZh,
} as const;

export function packError(): string {
  const err: string[] = [];
  if (packEn.length !== 100) err.push(`EN pack is ${packEn.length}`);
  // 100 AYK / Meituan / Didi lines, plus 40 class sentences. Meituan and Rider stay.
  if (packZh.length !== 140) err.push(`ZH pack is ${packZh.length}`);
  if (packZh.some((row) => !row.py?.trim())) err.push("ZH pack is missing pinyin");
  const words = wordDeckIssues(officeWords);
  if (words) err.push(words);
  const families = familyIssues(
    familyLessons,
    WORD_DECKS.filter((deck) => deck.kind === "family").map((deck) => deck.id),
  );
  if (families) err.push(families);
  return err.join("; ");
}
