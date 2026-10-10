import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MilestoneToast } from "../src/components/MilestoneToast";
import { PracticePanel } from "../src/components/PracticePanel";
import { ReminderControl } from "../src/components/ReminderControl";
import { StreakChrome } from "../src/components/StreakChrome";
import { StreakFlame } from "../src/components/StreakFlame";
import { emptySession } from "../src/practice/session";
import type { Sentence } from "../src/practice/types";
import {
  getReminder,
  getStreak,
  recordPracticeClearOrPartial,
  requestNotificationPermission,
  setReminder,
} from "../src/streak";
import { saveReminderPreference } from "../src/ui/streakActions";
import {
  MILESTONE_COPY,
  REMINDER_LABEL,
  REMINDER_PWA,
  REMINDER_SAVED,
  formatTimeValue,
  milestoneDay,
  parseTimeValue,
  readStreakPreview,
  visibleMilestone,
} from "../src/ui/streakCopy";

const item: Sentence = { set: "Office", zhSet: "办公室", en: "The printer is out.", zh: "打印机没纸了。" };

function visibleText(html: string): string {
  return html.replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&");
}

describe("streak chrome copy", () => {
  it("uses Chan's milestone lines exactly", () => {
    expect(MILESTONE_COPY[3]).toEqual({
      en: "Three days in a row — you're building a habit.",
      zh: "连续三天了——习惯正在形成。",
    });
    expect(MILESTONE_COPY[7]).toEqual({
      en: "A full week. Keep the gentle rhythm.",
      zh: "整整一周。保持这个温和的节奏。",
    });
    expect(MILESTONE_COPY[14]).toEqual({
      en: "Two weeks of showing up. That's the real win.",
      zh: "两周坚持。这才是真正的收获。",
    });
    expect(milestoneDay(3)).toBe(3);
    expect(milestoneDay(7)).toBe(7);
    expect(milestoneDay(14)).toBe(14);
    expect(milestoneDay(4)).toBeNull();
    expect(milestoneDay(15)).toBeNull();
    expect(visibleMilestone(7, 7)).toBeNull();
    expect(visibleMilestone(7, 3)).toBe(7);
  });

  it("renders the flame strip with current and best", () => {
    const html = renderToStaticMarkup(<StreakFlame current={7} best={14} />);
    expect(html).toContain('id="streak-current"');
    expect(html).toContain('id="streak-best"');
    expect(html).toContain(">7<");
    expect(html).toContain(">14<");
    expect(html).toContain("Streak");
    expect(html).toContain("连续");
    expect(html).toContain("Best");
    expect(html).toContain("最佳连续");
    expect(html).toContain("streak-flame");
    expect(html).not.toContain("is-dim");

    const quiet = renderToStaticMarkup(<StreakFlame current={0} best={0} />);
    expect(quiet).toContain("is-dim");
    expect(quiet).toContain("is-quiet");
  });

  it("renders the reminder toggle, time, and honest saved note", () => {
    const off = renderToStaticMarkup(
      <ReminderControl enabled={false} hour={20} minute={0} onChange={() => undefined} />,
    );
    expect(off).toContain(REMINDER_LABEL.en);
    expect(off).toContain(REMINDER_LABEL.zh);
    expect(off).toContain('id="reminder-toggle"');
    expect(off).toContain('aria-pressed="false"');
    expect(off).toContain('type="time"');
    expect(off).toContain('value="20:00"');
    expect(off).toContain(REMINDER_PWA.en);
    expect(off).toContain(REMINDER_PWA.zh);
    expect(off).not.toContain(REMINDER_SAVED.en);

    const on = renderToStaticMarkup(
      <ReminderControl enabled={true} hour={9} minute={5} onChange={() => undefined} />,
    );
    expect(on).toContain('aria-pressed="true"');
    expect(on).toContain('value="09:05"');
    expect(on).toContain(REMINDER_SAVED.en);
    expect(on).toContain(REMINDER_SAVED.zh);
    expect(on).toContain(REMINDER_PWA.en);
  });

  it("shows each milestone toast in the practice language, with the other line under it", () => {
    for (const day of [3, 7, 14] as const) {
      const en = visibleText(renderToStaticMarkup(<MilestoneToast day={day} lang="en" onDismiss={() => undefined} />));
      const zh = visibleText(renderToStaticMarkup(<MilestoneToast day={day} lang="zh" onDismiss={() => undefined} />));
      expect(en).toContain(MILESTONE_COPY[day].en);
      expect(en).toContain(MILESTONE_COPY[day].zh);
      expect(en.indexOf(MILESTONE_COPY[day].en)).toBeLessThan(en.indexOf(MILESTONE_COPY[day].zh));
      expect(zh.indexOf(MILESTONE_COPY[day].zh)).toBeLessThan(zh.indexOf(MILESTONE_COPY[day].en));
      expect(en).toContain('role="status"');
      expect(en).toContain("Got it");
      expect(en).toContain("知道了");
    }
  });

  it("places the chrome above the session strip and only toasts real milestone days", () => {
    const html = renderToStaticMarkup(
      <PracticePanel
        {...({
          lang: "en",
          index: 0,
          item,
          pack: [item],
          marks: null,
          outcome: "idle",
          heardPreview: "",
          kicker: "Hello",
          heard: "Hi",
          score: "",
          modelNote: "",
          listening: false,
          error: "",
          jump: () => undefined,
          jumpTo: () => undefined,
          hear: () => undefined,
          sayIt: () => undefined,
          pace: "normal",
          setPace: () => undefined,
          session: emptySession(),
          lineOutcome: null,
          resetSession: () => undefined,
        } as Parameters<typeof PracticePanel>[0])}
      />,
    );
    expect(html.indexOf('id="streak-strip"')).toBeGreaterThan(-1);
    expect(html.indexOf('id="streak-strip"')).toBeLessThan(html.indexOf('id="session-strip"'));
    expect(html).toContain('id="reminder-control"');
    expect(html).not.toContain('id="milestone-toast"');

    const week = renderToStaticMarkup(
      <StreakChrome
        lang="zh"
        streak={{ current: 7, best: 9 }}
        reminder={{ enabled: true, hour: 21, minute: 30 }}
        onReminderChange={() => undefined}
      />,
    );
    expect(week).toContain("整整一周。保持这个温和的节奏。");
    expect(week).toContain("A full week. Keep the gentle rhythm.");
    expect(week.indexOf("整整一周")).toBeLessThan(week.indexOf("A full week"));
    expect(week).toContain(REMINDER_SAVED.zh);
    expect(week).toContain('value="21:30"');

    const between = renderToStaticMarkup(
      <StreakChrome
        lang="en"
        streak={{ current: 4, best: 4 }}
        reminder={{ enabled: false, hour: 20, minute: 0 }}
        onReminderChange={() => undefined}
      />,
    );
    expect(between).not.toContain('id="milestone-toast"');
  });
});

describe("streak stub adapter", () => {
  it("round-trips the reminder and leaves the streak at zero", async () => {
    setReminder({ enabled: false, hour: 20, minute: 0 });
    expect(getStreak()).toEqual({ current: 0, best: 0 });
    recordPracticeClearOrPartial();
    expect(getStreak()).toEqual({ current: 0, best: 0 });

    await saveReminderPreference({ enabled: false, hour: 8, minute: 15 });
    expect(getReminder()).toEqual({ enabled: false, hour: 8, minute: 15 });

    await saveReminderPreference({ enabled: true, hour: 8, minute: 15 });
    expect(getReminder()).toEqual({ enabled: true, hour: 8, minute: 15 });
    await expect(requestNotificationPermission()).resolves.toBe("unavailable");

    setReminder({ enabled: true, hour: 99, minute: -4 });
    expect(getReminder()).toEqual({ enabled: true, hour: 23, minute: 0 });
    expect(formatTimeValue(8, 5)).toBe("08:05");
    expect(parseTimeValue("08:05")).toEqual({ hour: 8, minute: 5 });
    expect(parseTimeValue("8:05")).toEqual({ hour: 8, minute: 5 });
    expect(parseTimeValue("20:00:00")).toEqual({ hour: 20, minute: 0 });
    expect(parseTimeValue("24:00")).toBeNull();
    expect(readStreakPreview("?streakPreview=7,14")).toEqual({ current: 7, best: 14 });
    expect(readStreakPreview("?streakPreview=nope")).toBeNull();
  });

  it("does not implement day storage, notification scheduling, or call the recorder from chrome", () => {
    const stub = readFileSync(new URL("../src/streak/stub.ts", import.meta.url), "utf8");
    const code = stub.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    expect(code).not.toMatch(/\blocalStorage\b|\bsessionStorage\b|\bindexedDB\b|\bCapacitor\b|new Notification|serviceWorker|showNotification/);
    expect(code).toContain('return "unavailable"');
    const actions = readFileSync(new URL("../src/ui/streakActions.ts", import.meta.url), "utf8");
    expect(actions).toContain("setReminder");
    expect(actions).toContain("requestNotificationPermission");
    expect(actions).not.toContain("recordPracticeClearOrPartial");

    for (const file of [
      "../src/components/StreakChrome.tsx",
      "../src/components/StreakFlame.tsx",
      "../src/components/ReminderControl.tsx",
      "../src/components/MilestoneToast.tsx",
      "../src/components/PracticePanel.tsx",
      "../src/practice/usePractice.ts",
      "../src/speech/stt.ts",
    ]) {
      const src = readFileSync(new URL(file, import.meta.url), "utf8")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/\/\/.*$/gm, "");
      expect(src, file).not.toContain("recordPracticeClearOrPartial");
    }
  });
});
