import type { SessionTally } from "./session";

export type FeedbackKind = "start" | "clear" | "partial" | "miss" | "recognition_fail" | "end";

export type FeedbackLines = { en: string[]; zh: string[] };

/** Today's clear-match progress. Omit it and the clear line stays the short praise. */
export type DayProgress = {
  clears: number;
  goal: number;
  complete: boolean;
};

function clearFeedback(day?: DayProgress | null): FeedbackLines {
  if (!day || day.goal < 1) {
    return { en: ["Nice — clear match."], zh: ["很棒，对上了。"] };
  }
  if (day.complete) {
    return {
      en: ["Nice — clear match. 🔥 Day complete."],
      zh: ["很棒，对上了。🔥 今天完成。"],
    };
  }
  const shown = Math.min(Math.max(0, Math.floor(day.clears)), day.goal);
  return {
    en: [`Nice — clear match. ${shown}/${day.goal} today.`],
    zh: [`很棒，对上了。今天 ${shown}/${day.goal}。`],
  };
}

/** Hero copy. Stars are encouragement for clear lines. Mic unsure is not a miss. */
export function feedbackLines(kind: FeedbackKind, tally: SessionTally, day?: DayProgress | null): FeedbackLines {
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
      return clearFeedback(day);
    case "partial":
      return {
        en: ["Partly there — Hear it, then try again.", "Only a full clear counts today."],
        zh: ["对上一部分了——先听一遍，再试一次。", "只有全部对上才算今天。"],
      };
    case "miss":
      return {
        en: ["Not quite — Hear it once, then Say it again.", "A full clear is what counts today."],
        zh: ["还差一点——先听，再说一次。", "今天要的是整句听清。"],
      };
    case "recognition_fail":
      return {
        en: ["Mic may have misheard — not on you.", "Hear it, then Say it again."],
        zh: ["可能是识别听错了——不是你的问题。", "先听一听，再说一次。"],
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
