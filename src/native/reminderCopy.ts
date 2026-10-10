/** Bilingual lines for the Android reminder card. Loud on purpose when permission is missing. */

export const REMINDER_ANDROID_ON = {
  en: "Daily reminder is on for this phone's clock. A short meow in about one minute confirms it. It then repeats every day, and on Monday adds the week summary.",
  zh: "每天提醒已开，按这台手机的时间。大约一分钟后会有一声轻猫叫确认。之后每天重复，周一再加上本周总结。",
} as const;

export const REMINDER_ANDROID_DENIED = {
  en: "Notifications are blocked, so this reminder stays off. Open Settings → Apps → 课猫 Echo → Notifications, allow them, then turn this switch on again.",
  zh: "通知被拒绝了，所以提醒保持关闭。请打开系统设置 → 应用 → 课猫 Echo → 通知，允许通知，然后再打开这个开关。",
} as const;

export const REMINDER_ANDROID_EXACT = {
  en: "Exact alarms are off, so this reminder stays off. Allow Alarms & reminders for 课猫 Echo, then turn this switch on again.",
  zh: "精确闹钟没开，所以提醒保持关闭。请允许课猫 Echo 的「闹钟和提醒」，然后再打开这个开关。",
} as const;

export const REMINDER_ANDROID_FAILED = {
  en: "The reminder could not be scheduled, so it stays off. Allow notifications and exact alarms, then turn this switch on again.",
  zh: "提醒没有排上，所以保持关闭。请允许通知和精确闹钟，然后再打开这个开关。",
} as const;

export const REMINDER_ANDROID_CLOCK = {
  en: "This time is the phone's own clock. It is not converted to Shanghai.",
  zh: "这个时间是手机本地时间，不会换算成上海时间。",
} as const;

export const REMINDER_ANDROID_BATTERY = {
  en: "If the meow never arrives, set Battery to Unrestricted for 课猫 Echo.",
  zh: "如果一直没有猫叫，请把课猫 Echo 的电池设为无限制。",
} as const;
