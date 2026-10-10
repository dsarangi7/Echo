import type { Lang } from "./types";

/** Soft-fail when unique token overlap is below this, unless the line is a short Chinese target. */
export const OVERLAP_FAIL_RATIO = 0.15;

/**
 * Short Chinese lines (≤6 字) use a higher bar. One shared character is 1/5 or 1/6,
 * which is still a wild miss, so overlap at or under this ratio is a recognition failure.
 */
export const SHORT_ZH_OVERLAP_FAIL_RATIO = 0.2;
export const SHORT_ZH_MAX_CHARS = 6;

/** Pre-score reject when the transcript token count is longer than this times the target. */
export const HEARD_LENGTH_FACTOR = 2.5;

export const RECOGNITION_FAIL_EN = "Recognition may be wrong — try Hear it, then Say it again.";
export const RECOGNITION_FAIL_ZH = "识别可能不对——先听一听，再说一次。";

export type GradeOutcome = "scored" | "recognition_fail";

export type Grade = {
  outcome: GradeOutcome;
  /** Null on recognition failure so the target is not painted wrong. */
  marks: boolean[] | null;
  good: number;
  total: number;
  /** Empty on recognition failure. Never a percent. */
  label: string;
  heardPreview: string;
  overlapRatio: number;
};

export function recognitionFailHeadline(lang: Lang): string {
  return lang === "zh"
    ? `${RECOGNITION_FAIL_ZH} ${RECOGNITION_FAIL_EN}`
    : `${RECOGNITION_FAIL_EN} ${RECOGNITION_FAIL_ZH}`;
}

export function micHeardLine(lang: Lang, preview: string): string {
  const text = preview.trim();
  if (!text) {
    return lang === "zh"
      ? "麦克风没识别出内容。 Mic heard nothing."
      : "Mic heard nothing. 麦克风没识别出内容。";
  }
  return lang === "zh" ? `麦克风听到：${text} · Mic heard: ${text}` : `Mic heard: ${text} · 麦克风听到：${text}`;
}

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

/** Unique-token overlap: |target set ∩ heard set| / |target set|. */
export function overlapRatio(target: string[], heard: string[]): number {
  if (target.length === 0) return 0;
  const heardSet = new Set(heard);
  const targetSet = new Set<string>();
  let hit = 0;
  for (const token of target) {
    if (targetSet.has(token)) continue;
    targetSet.add(token);
    if (heardSet.has(token)) hit += 1;
  }
  return hit / targetSet.size;
}

export function isShortZhTarget(lang: Lang, target: string[]): boolean {
  return lang === "zh" && target.length > 0 && target.length <= SHORT_ZH_MAX_CHARS;
}

export function isShortZhLine(lang: Lang, text: string): boolean {
  return lang === "zh" && isShortZhTarget(lang, charsOf(text));
}

function hasLatin(text: string): boolean {
  return /[A-Za-z]/.test(text);
}

function hasHan(text: string): boolean {
  return /\p{Script=Han}/u.test(text);
}

/**
 * M2 rejects applied before a match count is shown.
 * Empty, longer than 2.5× the target, Latin-only while practicing 中文, or Han-only while practicing English.
 */
export function preScoreReject(lang: Lang, target: string[], heard: string[], transcript: string): boolean {
  const folded = transcript.normalize("NFKC");
  if (heard.length === 0 || folded.trim() === "") return true;
  if (target.length > 0 && heard.length > HEARD_LENGTH_FACTOR * target.length) return true;
  if (lang === "zh" && hasLatin(folded) && !hasHan(folded)) return true;
  if (lang === "en" && hasHan(folded) && !hasLatin(folded)) return true;
  return false;
}

function recognitionFail(total: number, heardPreview: string, ratio: number, good = 0): Grade {
  return {
    outcome: "recognition_fail",
    marks: null,
    good,
    total,
    label: "",
    heardPreview,
    overlapRatio: ratio,
  };
}

export function gradeTranscript(lang: Lang, targetText: string, transcript: string): Grade {
  const target = lang === "en" ? wordsOf(targetText) : charsOf(targetText);
  const heard = lang === "en" ? wordsOf(transcript) : charsOf(transcript);
  const heardPreview = transcript.trim();
  const ratio = overlapRatio(target, heard);
  const unit = lang === "en" ? "words" : "字";

  if (preScoreReject(lang, target, heard, transcript)) {
    return recognitionFail(target.length, heardPreview, ratio);
  }

  const marks = matchSeq(target, heard);
  const good = marks.filter(Boolean).length;
  const shortZh = isShortZhTarget(lang, target);
  const threshold = shortZh ? SHORT_ZH_OVERLAP_FAIL_RATIO : OVERLAP_FAIL_RATIO;
  const overlapFail = shortZh ? ratio <= threshold : ratio < threshold;
  if (good === 0 || overlapFail) {
    return recognitionFail(target.length, heardPreview, ratio, good);
  }

  return {
    outcome: "scored",
    marks,
    good,
    total: target.length,
    label: `${good} of ${target.length} ${unit}`,
    heardPreview,
    overlapRatio: ratio,
  };
}
