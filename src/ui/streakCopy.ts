import { milestoneForDays, type StreakMilestone, type StreakUpdate } from "../practice/streak";
import type { Lang } from "../practice/types";

/** Chan's milestone lines. Use these strings exactly. */
export const MILESTONE_COPY: Record<StreakMilestone, { en: string; zh: string }> = {
  3: {
    en: "Three days in a row — you're building a habit.",
    zh: "连续三天了——习惯正在形成。",
  },
  7: {
    en: "A full week. Keep the gentle rhythm.",
    zh: "整整一周。保持这个温和的节奏。",
  },
  14: {
    en: "Two weeks of showing up. That's the real win.",
    zh: "两周坚持。这才是真正的收获。",
  },
};

export const REMINDER_LABEL = {
  en: "Remind me daily at",
  zh: "每天提醒我",
} as const;

export const REMINDER_ON = {
  en: "Daily reminder is on.",
  zh: "每天提醒已开。",
} as const;

export const REMINDER_UNAVAILABLE = {
  en: "Saved — will remind when notifications are available.",
  zh: "已保存——通知可用时会提醒。",
} as const;

export const REMINDER_DENIED = {
  en: "Notifications are blocked, so the reminder stays off.",
  zh: "通知被拦住了，提醒保持关闭。",
} as const;

export const REMINDER_PWA = {
  en: "Reminders work best when the app is installed. Not an exact alarm.",
  zh: "安装到主屏幕后，提醒更稳。不是准点闹钟。",
} as const;

export type ReminderNote = "idle" | "on" | "denied" | "unavailable";

export function milestoneLines(day: StreakMilestone, lang: Lang): { primary: string; secondary: string } {
  const copy = MILESTONE_COPY[day];
  return lang === "zh" ? { primary: copy.zh, secondary: copy.en } : { primary: copy.en, secondary: copy.zh };
}

/** One-shot from Kai's `echo-streak-changed` detail. Same-day repeats stay null. */
export function milestoneJustHit(event: Event): StreakMilestone | null {
  const detail = (event as CustomEvent<Partial<StreakUpdate> | undefined>).detail;
  if (!detail || typeof detail.milestoneJustHit !== "number") return null;
  return milestoneForDays(detail.milestoneJustHit);
}
