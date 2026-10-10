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

export const REMINDER_IOS_HINT = {
  en: "On iPhone, Echo can't ring while closed. After the time passes, open Echo again for the nudge. Android app can ring on time.",
  zh: "在 iPhone 上，Echo 关闭后不会响。过了时间再打开 Echo，才会收到提醒。Android 应用可以准时响。",
} as const;

export const REMINDER_LOCAL_TIME = {
  en: "The time is this device's local time.",
  zh: "时间按这台设备的本地时间。",
} as const;

export const REMINDER_PWA = {
  en: `${REMINDER_IOS_HINT.en} ${REMINDER_LOCAL_TIME.en}`,
  zh: `${REMINDER_IOS_HINT.zh}${REMINDER_LOCAL_TIME.zh}`,
} as const;

export const REMINDER_PASSED = {
  en: "Today's time already passed on this device — you'll get the nudge next open after tomorrow's time.",
  zh: "今天的时间已经过了（按这台设备的时间）——明天那个时间之后再次打开，才会收到提醒。",
} as const;

export function reminderWaitingCopy(time: string): { en: string; zh: string } {
  return {
    en: `We'll nudge when you open Echo after ${time} on this device (iPhone can't alert while closed).`,
    zh: `这台设备的 ${time} 之后再打开 Echo，就会提醒你（iPhone 关闭后不会响）。`,
  };
}

export type ReminderNote = "idle" | "on" | "waiting" | "passed" | "denied" | "unavailable";

export function openReminderNote(input: {
  enabled: boolean;
  slotPassed: boolean;
  handledToday: boolean;
  problem?: "denied" | "unavailable" | null;
}): ReminderNote {
  if (input.problem) return input.problem;
  if (!input.enabled) return "idle";
  if (!input.slotPassed) return "waiting";
  if (input.handledToday) return "passed";
  return "on";
}

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
