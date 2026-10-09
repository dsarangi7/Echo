import type { Lang } from "./types";

export function wordsOf(s: string): string[] {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9'\-\s]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

export function charsOf(s: string): string[] {
  return Array.from(
    String(s || "")
      .replace(/\s+/g, "")
      .replace(/[\u3000\u200b]/g, "")
      .replace(/[\p{P}\p{S}]/gu, ""),
  );
}

/** Prefer in-order matches, then any leftover word or character. */
export function matchSeq(target: string[], heard: string[]): boolean[] {
  const used = heard.map(() => false);
  const marks = target.map(() => false);
  let h = 0;
  for (let i = 0; i < target.length; i++) {
    let j = h;
    while (j < heard.length && heard[j] !== target[i]) j++;
    if (j < heard.length) {
      marks[i] = true;
      used[j] = true;
      h = j + 1;
    }
  }
  for (let i = 0; i < target.length; i++) {
    if (marks[i]) continue;
    const j = heard.findIndex((c, idx) => !used[idx] && c === target[i]);
    if (j >= 0) {
      marks[i] = true;
      used[j] = true;
    }
  }
  return marks;
}

export function gradeTranscript(lang: Lang, targetText: string, transcript: string) {
  const target = lang === "en" ? wordsOf(targetText) : charsOf(targetText);
  const heard = lang === "en" ? wordsOf(transcript) : charsOf(transcript);
  const marks = matchSeq(target, heard);
  const good = marks.filter(Boolean).length;
  const unit = lang === "en" ? "words" : "字";
  return {
    marks,
    good,
    total: target.length,
    label: `${good} of ${target.length} ${unit}`,
  };
}
