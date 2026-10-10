import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { nextDeviceMonday } from "../src/practice/deviceClock";
import { previousShanghaiWeek, dailyNudgeCopy, emptyReminder } from "../src/practice/reminder";
import {
  CHANNEL_IMPORTANCE_HIGH,
  DAILY_NOTIFICATION_ID,
  MEOW_FILE,
  MEOW_SOUND,
  MONDAY,
  PRACTICE_CHANNEL_ID,
  TEST_DELAY_MS,
  TEST_NOTIFICATION_ID,
  WEEKLY_NOTIFICATION_ID,
  buildNativeReminderPlan,
  buildTestReminder,
  practiceChannel,
  weekStartForNextMondaySummary,
} from "../src/native/reminderPlan";
import { gateReminderPermissions, shouldPersistEnabled } from "../src/native/reminderAccess";
import { REMINDER_ANDROID_DENIED, REMINDER_ANDROID_EXACT } from "../src/native/reminderCopy";

describe("Android reminder plan", () => {
  it("fires at the phone hour and minute with no Shanghai offset", () => {
    const now = new Date(2026, 9, 7, 15, 0, 0);
    const plan = buildNativeReminderPlan(
      { ...emptyReminder(), enabled: true, time: "08:30" },
      ["2026-10-04", "2026-10-05", "2026-10-07"],
      now,
    );
    const daily = dailyNudgeCopy();
    expect(plan[0]).toMatchObject({
      id: DAILY_NOTIFICATION_ID,
      title: daily.title,
      body: daily.body,
      channelId: PRACTICE_CHANNEL_ID,
      sound: MEOW_FILE,
      smallIcon: "ic_stat_echo",
      isExactNotification: true,
      isExactMandatory: true,
      schedule: { repeats: true, allowWhileIdle: true, on: { hour: 8, minute: 30 } },
    });
    expect(plan[1]).toMatchObject({
      id: WEEKLY_NOTIFICATION_ID,
      channelId: PRACTICE_CHANNEL_ID,
      sound: MEOW_FILE,
      isExactNotification: true,
      isExactMandatory: true,
      schedule: { repeats: true, allowWhileIdle: true, on: { hour: 8, minute: 30, weekday: MONDAY } },
    });
    expect(plan[1].body).toMatch(/^You practiced \d+ days? this week/);
    expect(plan[1].body).toContain("这周你练了");
    const dailySchedule = plan[0].schedule;
    const weeklySchedule = plan[1].schedule;
    if (!("on" in dailySchedule) || !("on" in weeklySchedule)) throw new Error("repeating alarms use on");
    expect(dailySchedule.on).toEqual({ hour: 8, minute: 30 });
    expect(weeklySchedule.on).toEqual({ hour: 8, minute: 30, weekday: MONDAY });
  });

  it("summarizes the Shanghai week that ends before the next phone-local Monday alarm", () => {
    const mondayMorning = new Date(2026, 9, 5, 8, 0, 0);
    const alarm = nextDeviceMonday(mondayMorning, "20:00");
    expect(alarm.getDay()).toBe(1);
    expect(alarm.getHours()).toBe(20);
    expect(weekStartForNextMondaySummary(mondayMorning, "20:00")).toBe(previousShanghaiWeek(alarm));

    const mondayEvening = new Date(2026, 9, 5, 21, 0, 0);
    const nextWeek = nextDeviceMonday(mondayEvening, "20:00");
    expect(nextWeek.getDate()).not.toBe(mondayEvening.getDate());
    expect(weekStartForNextMondaySummary(mondayEvening, "20:00")).toBe(previousShanghaiWeek(nextWeek));
  });

  it("schedules nothing while the reminder is off", () => {
    expect(buildNativeReminderPlan(emptyReminder(), ["2026-10-07"], new Date(2026, 9, 7, 12, 0, 0))).toEqual([]);
  });

  it("builds a one-minute test meow that does not repeat", () => {
    const now = new Date(2026, 9, 7, 12, 0, 0);
    const test = buildTestReminder(now);
    expect(test.id).toBe(TEST_NOTIFICATION_ID);
    expect(test.schedule).toMatchObject({ allowWhileIdle: true, repeats: false });
    if (!("at" in test.schedule)) throw new Error("test reminder needs a timestamp");
    expect(test.schedule.at.getTime() - now.getTime()).toBe(TEST_DELAY_MS);
    expect(test.sound).toBe(MEOW_FILE);
  });

  it("creates a high-importance channel with the meow resource", () => {
    expect(practiceChannel()).toMatchObject({
      id: PRACTICE_CHANNEL_ID,
      importance: CHANNEL_IMPORTANCE_HIGH,
      sound: MEOW_SOUND,
      vibration: true,
    });
    expect(CHANNEL_IMPORTANCE_HIGH).toBe(4);
    expect(MEOW_SOUND).not.toContain(".");
  });
});

describe("Android reminder permission gate", () => {
  it("refuses to schedule when notifications are not granted", () => {
    expect(gateReminderPermissions({ display: "denied", exactAlarm: "granted" })).toBe("need-notification");
    expect(gateReminderPermissions({ display: "prompt", exactAlarm: "granted" })).toBe("need-notification");
    expect(shouldPersistEnabled("denied")).toBe(false);
    expect(shouldPersistEnabled("failed")).toBe(false);
    expect(shouldPersistEnabled("exact-denied")).toBe(false);
    expect(REMINDER_ANDROID_DENIED.en).toMatch(/stays off/i);
    expect(REMINDER_ANDROID_DENIED.zh).toMatch(/保持关闭/);
    expect(REMINDER_ANDROID_DENIED.en).toMatch(/Settings/);
  });

  it("refuses to schedule when exact alarms are off, and allows older Android", () => {
    expect(gateReminderPermissions({ display: "granted", exactAlarm: "denied" })).toBe("need-exact");
    expect(gateReminderPermissions({ display: "granted", exactAlarm: "prompt" })).toBe("need-exact");
    expect(gateReminderPermissions({ display: "granted", exactAlarm: "unavailable" })).toBe("schedule");
    expect(gateReminderPermissions({ display: "granted", exactAlarm: "granted" })).toBe("schedule");
    expect(shouldPersistEnabled("scheduled")).toBe(true);
    expect(REMINDER_ANDROID_EXACT.en).toMatch(/Exact alarms/);
    expect(REMINDER_ANDROID_EXACT.zh).toMatch(/精确闹钟/);
  });
});

describe("Android manifest for reminders", () => {
  it("declares notification permission, exact alarms, and version 1.0.1", () => {
    const xml = readFileSync("android/app/src/main/AndroidManifest.xml", "utf8");
    expect(xml).toContain("android.permission.POST_NOTIFICATIONS");
    expect(xml).toContain("android.permission.SCHEDULE_EXACT_ALARM");
    expect(xml).toContain("android.permission.USE_EXACT_ALARM");
    const gradle = readFileSync("android/app/build.gradle", "utf8");
    expect(gradle).toContain("versionCode 2");
    expect(gradle).toContain('versionName "1.0.1"');
    expect(existsSync("android/app/src/main/res/raw/echo_meow.wav")).toBe(true);
  });
});
