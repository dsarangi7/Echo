import type { Lang } from "../practice/types";

export const MILESTONE_DAYS = [3, 7, 14] as const;

export type MilestoneDay = (typeof MILESTONE_DAYS)[number];

/** Chan's milestone lines. Use these strings exactly. */
export const MILESTONE_COPY: Record<MilestoneDay, { en: string; zh: string }> = {
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

export const REMINDER_SAVED = {
  en: "Saved — will remind when notifications are available.",
  zh: "已保存——通知可用时会提醒。",
} as const;

export const REMINDER_PWA = {
  en: "Reminders work best when the app is installed.",
  zh: "安装到主屏幕后，提醒更稳。",
} as const;

export function milestoneDay(current: number): MilestoneDay | null {
  if (current === 3 || current === 7 || current === 14) return current;
  return null;
}

/** Hide a milestone card after it has been dismissed this visit. Not day storage. */
export function visibleMilestone(current: number, dismissed: number | null): MilestoneDay | null {
  const day = milestoneDay(current);
  if (day === null || day === dismissed) return null;
  return day;
}

export function milestoneLines(day: MilestoneDay, lang: Lang): { primary: string; secondary: string } {
  const copy = MILESTONE_COPY[day];
  return lang === "zh" ? { primary: copy.zh, secondary: copy.en } : { primary: copy.en, secondary: copy.zh };
}

export function formatTimeValue(hour: number, minute: number): string {
  const h = String(Math.min(23, Math.max(0, Math.floor(hour)))).padStart(2, "0");
  const m = String(Math.min(59, Math.max(0, Math.floor(minute)))).padStart(2, "0");
  return `${h}:${m}`;
}

export function parseTimeValue(value: string): { hour: number; minute: number } | null {
  const match = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(value.trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return { hour, minute };
}

/**
 * Dev-only display fixture (`?streakPreview=7,14`).
 * Does not record a practice day and does not write storage.
 */
export function readStreakPreview(search: string): { current: number; best: number } | null {
  const raw = new URLSearchParams(search).get("streakPreview");
  if (!raw) return null;
  const match = /^(\d+),(\d+)$/.exec(raw);
  if (!match) return null;
  const current = Number(match[1]);
  const best = Number(match[2]);
  if (current > 9999 || best > 9999) return null;
  return { current, best };
}
