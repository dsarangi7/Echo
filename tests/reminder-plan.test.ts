import { describe, expect, it } from "vitest";
import {
  DAILY_NOTIFICATION_ID,
  MONDAY,
  WEEKLY_NOTIFICATION_ID,
  buildNativeReminderPlan,
  weekStartForNextMondaySummary,
} from "../src/native/reminderPlan";
import { dailyNudgeCopy, emptyReminder, weeklyNudgeCopy } from "../src/practice/reminder";

const WEDNESDAY = new Date("2026-10-07T04:00:00.000Z");

describe("Android reminder plan", () => {
  it("uses the web daily and weekly sentences at the saved Shanghai time", () => {
    const plan = buildNativeReminderPlan(
      { ...emptyReminder(), enabled: true, time: "08:30" },
      ["2026-10-04", "2026-10-05", "2026-10-07"],
      WEDNESDAY,
    );
    const daily = dailyNudgeCopy();
    expect(plan[0]).toMatchObject({
      id: DAILY_NOTIFICATION_ID,
      title: daily.title,
      body: daily.body,
      schedule: { repeats: true, allowWhileIdle: true, on: { hour: 8, minute: 30 } },
    });
    expect(plan[1]).toMatchObject({
      id: WEEKLY_NOTIFICATION_ID,
      body: weeklyNudgeCopy(2).body,
      schedule: { on: { hour: 8, minute: 30, weekday: MONDAY } },
    });
    expect(plan[1].body).toBe("You practiced 2 days this week — keep the streak. 这周你练了 2 天——保持连续打卡。");
  });

  it("summarizes the previous week when Monday's alarm has not fired yet", () => {
    const mondayMorning = new Date("2026-10-05T00:00:00.000Z");
    expect(weekStartForNextMondaySummary(mondayMorning, "20:00")).toBe("2026-09-28");
    expect(weekStartForNextMondaySummary(WEDNESDAY, "20:00")).toBe("2026-10-05");
    expect(weekStartForNextMondaySummary(new Date("2026-10-05T13:00:00.000Z"), "20:00")).toBe("2026-10-05");
  });

  it("schedules nothing while the web reminder is off", () => {
    expect(buildNativeReminderPlan(emptyReminder(), ["2026-10-07"], WEDNESDAY)).toEqual([]);
  });
});
