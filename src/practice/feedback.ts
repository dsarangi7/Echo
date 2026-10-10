import type { SessionTally } from "./session";

export type FeedbackKind = "start" | "clear" | "partial" | "miss" | "recognition_fail" | "end";

export type FeedbackLines = { en: string[]; zh: string[] };

/** Hero copy. Stars are encouragement for clear lines. Mic unsure is not a miss. */
export function feedbackLines(kind: FeedbackKind, tally: SessionTally): FeedbackLines {
  switch (kind) {
    case "start":
      return {
        en: [
          "Let's practice — listen first if you want.",
          "Stars track clear lines. Mic glitches don't count against you.",
        ],
        zh: ["开始练习吧——想先听也可以。", "星星只记听清说对的句子；识别不准不算你的错。"],
      };
    case "clear":
      return {
        en: [`Nice — clear match. Streak ×${tally.streak}.`],
        zh: [`很棒，对上了。连续 ×${tally.streak}。`],
      };
    case "partial":
      return {
        en: ["Partly there — Hear it, then try again.", "Streak holds."],
        zh: ["对上一部分了——先听一遍，再试一次。", "连击还在。"],
      };
    case "miss":
      return {
        en: ["Not quite — Hear it once, then Say it again.", "Streak resets; that's okay."],
        zh: ["还差一点——先听，再说一次。", "连击重置没关系。"],
      };
    case "recognition_fail":
      return {
        en: ["Mic may have misheard — not on you.", "Hear it, then Say it again. Streak safe."],
        zh: ["可能是识别听错了——不是你的问题。", "连击保留。"],
      };
    case "end":
      return {
        en: [
          `Session: ${tally.clear} clear · ${tally.partial} partial · ${tally.unsure} mic unsure.`,
          "No accent score — just word/字 matches.",
        ],
        zh: [`本局：听清 ${tally.clear} · 部分 ${tally.partial} · 识别不准 ${tally.unsure}。`],
      };
  }
}

export const UNSURE_TIP = {
  en: "Usually Whisper misheard — Hear it, try again — not counted against you.",
  zh: "多半是识别听错了——先听一听，再试一次——不算你的错。",
};

export function orderedFeedback(lang: "en" | "zh", lines: FeedbackLines): { primary: string[]; secondary: string[] } {
  return lang === "zh" ? { primary: lines.zh, secondary: lines.en } : { primary: lines.en, secondary: lines.zh };
}
