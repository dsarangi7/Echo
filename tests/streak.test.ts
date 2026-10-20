import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { shanghaiInstant } from "../src/practice/shanghai";
import {
  DAILY_CLEAR_GOAL,
  STREAK_MILESTONES,
  STREAK_STORAGE_KEY,
  loadStreak,
  qualifiesForStreak,
  recordClearMatch,
  recordSayItOutcome,
  revealPracticeStreak,
  sessionSayItCompletions,
  STREAK_REVEAL_AFTER,
  type StreakRecord,
  type StreakUpdate,
} from "../src/practice/streak";

function memoryStorage(initial?: Record<string, string>): Storage {
  const map = new Map(Object.entries(initial ?? {}));
  return {
    get length() {
      return map.size;
    },
    clear() {
      map.clear();
    },
    getItem(key: string) {
      return map.has(key) ? map.get(key)! : null;
    },
    key(index: number) {
      return [...map.keys()][index] ?? null;
    },
    removeItem(key: string) {
      map.delete(key);
    },
    setItem(key: string, value: string) {
      map.set(key, String(value));
    },
  };
}

function at(day: string, time = "12:00"): Date {
  return new Date(shanghaiInstant(day, time));
}

function stored(storage: Storage): StreakRecord {
  return JSON.parse(storage.getItem(STREAK_STORAGE_KEY) ?? "{}") as StreakRecord;
}

function finishDay(storage: Storage, when: Date, count = DAILY_CLEAR_GOAL): StreakUpdate {
  let last = recordClearMatch(storage, when);
  for (let i = 1; i < count; i += 1) last = recordClearMatch(storage, when);
  return last;
}

describe("Shanghai practice streak", () => {
  it("counts a day only after five Clears and ignores partial and mic unsure", () => {
    const storage = memoryStorage();
    const first = recordSayItOutcome(storage, "clear", at("2026-10-10", "00:30"));
    expect(first?.recorded).toBe(false);
    expect(first?.dayJustCompleted).toBe(false);
    expect(first?.view.current).toBe(0);
    expect(first?.view.todayClears).toBe(1);
    expect(first?.view.dayComplete).toBe(false);
    expect(first?.view.goal).toBe(5);

    expect(recordSayItOutcome(storage, "partial", at("2026-10-10", "01:00"))).toBeNull();
    expect(recordSayItOutcome(storage, "recognition_fail", at("2026-10-10"))).toBeNull();
    expect(recordSayItOutcome(storage, "miss", at("2026-10-10"))).toBeNull();
    expect(qualifiesForStreak("partial")).toBe(false);
    expect(qualifiesForStreak("recognition_fail")).toBe(false);
    expect(qualifiesForStreak("clear")).toBe(true);
    expect(stored(storage).todayClears).toBe(1);

    const fourth = finishDay(storage, at("2026-10-10", "12:00"), 3);
    expect(fourth.view.todayClears).toBe(4);
    expect(fourth.view.dayComplete).toBe(false);
    expect(stored(storage).practiceDays).toEqual([]);

    const fifth = recordClearMatch(storage, at("2026-10-10", "23:30"));
    expect(fifth.recorded).toBe(true);
    expect(fifth.dayJustCompleted).toBe(true);
    expect(fifth.view.current).toBe(1);
    expect(fifth.view.best).toBe(1);
    expect(fifth.view.practicedToday).toBe(true);
    expect(fifth.view.todayClears).toBe(5);
    expect(stored(storage).practiceDays).toEqual(["2026-10-10"]);
    expect(stored(storage).completed).toBe(5);

    const extra = recordClearMatch(storage, at("2026-10-10", "23:40"));
    expect(extra.recorded).toBe(false);
    expect(extra.dayJustCompleted).toBe(false);
    expect(extra.view.current).toBe(1);
    expect(extra.view.todayClears).toBe(6);
    expect(stored(storage).practiceDays).toEqual(["2026-10-10"]);
  });

  it("resets today's progress at midnight and keeps the chain when yesterday was completed", () => {
    const storage = memoryStorage();
    finishDay(storage, at("2026-10-10"));
    finishDay(storage, at("2026-10-11", "09:00"), 2);
    const evening = loadStreak(storage, at("2026-10-11", "21:00"));
    expect(evening).toMatchObject({ current: 1, todayClears: 2, dayComplete: false });

    const morning = loadStreak(storage, at("2026-10-12", "08:00"));
    expect(morning).toMatchObject({ current: 0, todayClears: 0, dayComplete: false, best: 1 });

    const storage2 = memoryStorage();
    finishDay(storage2, at("2026-10-10"));
    finishDay(storage2, at("2026-10-11"));
    expect(loadStreak(storage2, at("2026-10-12", "08:00"))).toMatchObject({
      current: 2,
      todayClears: 0,
      dayComplete: false,
      best: 2,
    });
    const restart = finishDay(storage2, at("2026-10-12"));
    expect(restart.view.current).toBe(3);
    expect(restart.view.dayComplete).toBe(true);
    expect(restart.milestoneJustHit).toBe(3);
  });

  it("keeps the streak through yesterday and resets it after a missed Shanghai day", () => {
    const storage = memoryStorage();
    finishDay(storage, at("2026-10-08"));
    finishDay(storage, at("2026-10-09"));
    finishDay(storage, at("2026-10-10"));
    expect(loadStreak(storage, at("2026-10-11", "08:00")).current).toBe(3);
    expect(loadStreak(storage, at("2026-10-12", "08:00"))).toMatchObject({ current: 0, best: 3 });
    expect(stored(storage).current).toBe(0);
    expect(stored(storage).best).toBe(3);

    const restart = finishDay(storage, at("2026-10-12"));
    expect(restart.view.current).toBe(1);
    expect(restart.view.best).toBe(3);
    expect(restart.milestoneJustHit).toBeNull();
  });

  it("reports 3, 7, and 14 only on the day the streak lands there", () => {
    const storage = memoryStorage();
    const hit: Array<number | null> = [];
    for (let day = 1; day <= 15; day += 1) {
      const key = `2026-10-${String(day).padStart(2, "0")}`;
      hit.push(finishDay(storage, at(key)).milestoneJustHit);
    }
    expect(hit[2]).toBe(3);
    expect(hit[6]).toBe(7);
    expect(hit[13]).toBe(14);
    expect(hit.filter(Boolean)).toEqual([3, 7, 14]);
    expect(STREAK_MILESTONES).toEqual([3, 7, 14]);
    expect(loadStreak(storage, at("2026-10-15")).milestone).toBeNull();
    expect(loadStreak(storage, at("2026-10-15")).current).toBe(15);
  });

  it("counts the Shanghai week from Monday and ignores a UTC date change that is still the same Shanghai day", () => {
    const storage = memoryStorage();
    // 2026-10-09T16:30Z is 2026-10-10 00:30 in Shanghai, a Saturday.
    finishDay(storage, new Date("2026-10-09T16:30:00Z"));
    finishDay(storage, at("2026-10-05"));
    finishDay(storage, at("2026-10-07"));
    const view = loadStreak(storage, at("2026-10-10", "21:00"));
    expect(view.daysThisWeek).toBe(3);
    expect(view.practiceDays).toEqual(["2026-10-05", "2026-10-07", "2026-10-10"]);
    expect(loadStreak(storage, at("2026-10-12")).daysThisWeek).toBe(0);
  });

  it("reveals the day streak after two successful sentences this session or ever", () => {
    expect(STREAK_REVEAL_AFTER).toBe(2);
    expect(sessionSayItCompletions({ clear: 1, partial: 1 })).toBe(2);
    expect(sessionSayItCompletions({ clear: 0, partial: 0 })).toBe(0);
    expect(revealPracticeStreak(0, 0)).toBe(false);
    expect(revealPracticeStreak(1, 0)).toBe(false);
    expect(revealPracticeStreak(2, 0)).toBe(true);
    expect(revealPracticeStreak(0, 2)).toBe(true);
    expect(revealPracticeStreak(1, 1)).toBe(false);

    const storage = memoryStorage({
      [STREAK_STORAGE_KEY]: JSON.stringify({
        current: 2,
        best: 2,
        lastPracticeDay: "2026-10-11",
        practiceDays: ["2026-10-10", "2026-10-11"],
      }),
    });
    const legacy = loadStreak(storage, at("2026-10-11"));
    expect(legacy.completed).toBe(2);
    expect(revealPracticeStreak(0, legacy.completed)).toBe(true);

    const fresh = memoryStorage();
    expect(revealPracticeStreak(0, loadStreak(fresh, at("2026-10-11")).completed)).toBe(false);
  });

  it("plays a victory sound only for a Clear, and only a Clear moves the day task", () => {
    const practice = readFileSync("src/practice/usePractice.ts", "utf8");
    const record = practice.slice(practice.indexOf("const recordOutcome"), practice.indexOf("const resetSession"));
    expect(record).toContain("recordClearMatch");
    expect(record).toContain("playVictory()");
    expect(record).not.toContain("recordPracticeClearOrPartial");
    const clearAt = record.indexOf('outcome === "clear"');
    const partialAt = record.indexOf('outcome === "clear" || outcome === "partial"');
    expect(clearAt).toBeGreaterThan(-1);
    expect(record.indexOf("playVictory()")).toBeGreaterThan(clearAt);
    expect(record.indexOf("playVictory()")).toBeLessThan(partialAt);
    expect(practice).toContain('recordOutcome("recognition_fail")');
  });
});
