import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { shanghaiInstant } from "../src/practice/shanghai";
import {
  STREAK_MILESTONES,
  STREAK_STORAGE_KEY,
  loadStreak,
  qualifiesForStreak,
  recordPracticeClearOrPartial,
  recordSayItOutcome,
  revealPracticeStreak,
  sessionSayItCompletions,
  STREAK_REVEAL_AFTER,
  type StreakRecord,
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

describe("Shanghai practice streak", () => {
  it("counts a Clear or Partial once per Shanghai day and ignores mic unsure", () => {
    const storage = memoryStorage();
    const first = recordSayItOutcome(storage, "clear", at("2026-10-10", "00:30"));
    expect(first?.recorded).toBe(true);
    expect(first?.view.current).toBe(1);
    expect(first?.view.best).toBe(1);
    expect(first?.view.practicedToday).toBe(true);
    expect(first?.view.lastPracticeDay).toBe("2026-10-10");

    const again = recordPracticeClearOrPartial(storage, at("2026-10-10", "23:30"));
    expect(again.recorded).toBe(false);
    expect(again.view.current).toBe(1);
    expect(again.view.completed).toBe(2);
    expect(stored(storage).practiceDays).toEqual(["2026-10-10"]);
    expect(stored(storage).completed).toBe(2);

    expect(recordSayItOutcome(storage, "recognition_fail", at("2026-10-11"))).toBeNull();
    expect(recordSayItOutcome(storage, "miss", at("2026-10-11"))).toBeNull();
    expect(qualifiesForStreak("recognition_fail")).toBe(false);
    expect(qualifiesForStreak("partial")).toBe(true);
    expect(stored(storage).current).toBe(1);

    const next = recordSayItOutcome(storage, "partial", at("2026-10-11", "00:05"));
    expect(next?.recorded).toBe(true);
    expect(next?.view.current).toBe(2);
    expect(next?.view.best).toBe(2);
    expect(next?.view.daysThisWeek).toBe(2);
  });

  it("keeps the streak through yesterday and resets it after a missed Shanghai day", () => {
    const storage = memoryStorage();
    recordPracticeClearOrPartial(storage, at("2026-10-08"));
    recordPracticeClearOrPartial(storage, at("2026-10-09"));
    recordPracticeClearOrPartial(storage, at("2026-10-10"));
    expect(loadStreak(storage, at("2026-10-11", "08:00")).current).toBe(3);
    expect(loadStreak(storage, at("2026-10-12", "08:00"))).toMatchObject({ current: 0, best: 3 });
    expect(stored(storage).current).toBe(0);
    expect(stored(storage).best).toBe(3);

    const restart = recordPracticeClearOrPartial(storage, at("2026-10-12"));
    expect(restart.view.current).toBe(1);
    expect(restart.view.best).toBe(3);
    expect(restart.milestoneJustHit).toBeNull();
  });

  it("reports 3, 7, and 14 only on the day the streak lands there", () => {
    const storage = memoryStorage();
    let hit: Array<number | null> = [];
    for (let day = 1; day <= 15; day += 1) {
      const key = `2026-10-${String(day).padStart(2, "0")}`;
      hit.push(recordPracticeClearOrPartial(storage, at(key)).milestoneJustHit);
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
    recordPracticeClearOrPartial(storage, new Date("2026-10-09T16:30:00Z"));
    recordPracticeClearOrPartial(storage, at("2026-10-05"));
    recordPracticeClearOrPartial(storage, at("2026-10-07"));
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

  it("wires Clear and Partial into Say it without counting recognition_fail", () => {
    const practice = readFileSync("src/practice/usePractice.ts", "utf8");
    const record = practice.slice(practice.indexOf("const recordOutcome"), practice.indexOf("const resetSession"));
    expect(record).toContain("recordPracticeClearOrPartial");
    expect(record).toContain('outcome === "clear" || outcome === "partial"');
    expect(practice).toContain('recordOutcome("recognition_fail")');
  });
});
