import type { Lang, Sentence } from "./types";

const SYLLABLE = /[A-Za-zĀÁǍÀĒÉĚÈĪÍǏÌŌÓǑÒŪÚǓÙǕǗǙǛāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜüÜ]+/;

/** 这儿 / 那儿 are one spoken syllable in the pack (`zhèr`, `nàr`) and cover two 汉字. */
const ERHUA = /^(?:zhèr|nàr)$/i;

export type PinyinPiece = {
  text: string;
  /** How many scored 汉字 this piece covers. Spaces and punctuation are 0. */
  marks: number;
};

/** Split a pinyin line into syllables, spaces, and punctuation. */
export function pinyinPieces(text: string): PinyinPiece[] {
  const pieces: PinyinPiece[] = [];
  const re = new RegExp(`(${SYLLABLE.source})|(\\s+)`, "gu");
  let last = 0;
  for (const match of text.matchAll(re)) {
    const index = match.index ?? 0;
    if (index > last) pieces.push({ text: text.slice(last, index), marks: 0 });
    const token = match[0];
    if (match[2]) pieces.push({ text: token, marks: 0 });
    else pieces.push({ text: token, marks: ERHUA.test(token) ? 2 : 1 });
    last = index + token.length;
  }
  if (last < text.length) pieces.push({ text: text.slice(last), marks: 0 });
  return pieces;
}

export function pinyinMarkCount(text: string): number {
  return pinyinPieces(text).reduce((sum, piece) => sum + piece.marks, 0);
}

/**
 * Text on the card. English practice shows the English sentence.
 * Chinese practice shows tone-marked pinyin, and falls back to 汉字 only if `py` is empty.
 */
export function readingText(lang: Lang, item: Pick<Sentence, "en" | "zh" | "py">): string {
  if (lang === "en") return item.en;
  const py = item.py?.trim();
  return py || item.zh;
}
