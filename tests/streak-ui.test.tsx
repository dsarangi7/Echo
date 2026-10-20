import { existsSync, readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MilestoneToast } from "../src/components/MilestoneToast";
import { PracticePanel } from "../src/components/PracticePanel";
import { ReminderControl } from "../src/components/ReminderControl";
import { StreakChrome } from "../src/components/StreakChrome";
import { StreakFlame } from "../src/components/StreakFlame";
import { emptySession, type SessionTally } from "../src/practice/session";
import { milestoneForDays, STREAK_CHANGED_EVENT } from "../src/practice/streak";
import type { Sentence } from "../src/practice/types";
import {
  MILESTONE_COPY,
  REMINDER_DENIED,
  REMINDER_HONESTY,
  REMINDER_LABEL,
  REMINDER_ON,
  REMINDER_PASSED,
  REMINDER_UNAVAILABLE,
  milestoneJustHit,
  openReminderNote,
  reminderWaitingCopy,
} from "../src/ui/streakCopy";

const item: Sentence = { set: "Office", zhSet: "办公室", en: "The printer is out.", zh: "打印机没纸了。" };

function visibleText(html: string): string {
  return html.replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&");
}

describe("streak chrome copy", () => {
  it("uses Hero's milestone lines exactly", () => {
    expect(MILESTONE_COPY[3]).toEqual({
      en: "You’ve practiced three days in a row. Keep going at your own pace.",
      zh: "你已经连续练了三天。按自己的节奏继续就好。",
    });
    expect(MILESTONE_COPY[7]).toEqual({
      en: "A week of listening and speaking — that’s real progress. Nice work.",
      zh: "听和说了一周——这是实实在在的进步。做得好。",
    });
    expect(MILESTONE_COPY[14]).toEqual({
      en: "Two weeks of steady practice. You’re building a habit that lasts.",
      zh: "两周稳定的练习。你正在养成能持续下去的习惯。",
    });
    expect(milestoneForDays(3)).toBe(3);
    expect(milestoneForDays(7)).toBe(7);
    expect(milestoneForDays(14)).toBe(14);
    expect(milestoneForDays(4)).toBeNull();
    expect(milestoneJustHit({ detail: { milestoneJustHit: 7 } } as unknown as Event)).toBe(7);
    expect(milestoneJustHit({ detail: { milestoneJustHit: null } } as unknown as Event)).toBeNull();
    expect(milestoneJustHit(new Event(STREAK_CHANGED_EVENT))).toBeNull();
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

  it("renders the reminder toggle, time, and honest status", () => {
    const off = visibleText(
      renderToStaticMarkup(<ReminderControl enabled={false} time="20:00" note="idle" onChange={() => undefined} />),
    );
    expect(off).toContain(REMINDER_LABEL.en);
    expect(off).toContain(REMINDER_LABEL.zh);
    expect(off).toContain('id="reminder-toggle"');
    expect(off).toContain('aria-pressed="false"');
    expect(off).toContain('type="time"');
    expect(off).toContain('value="20:00"');
    expect(off).toContain('aria-label="Reminder time, local"');
    expect(off).toContain(REMINDER_HONESTY.en);
    expect(off).toContain(REMINDER_HONESTY.zh);
    expect(off).not.toContain("After the time passes, open Echo again");
    expect(off).not.toContain("Shanghai time");
    expect(off).not.toContain(REMINDER_ON.en);
    expect(off).not.toContain(REMINDER_UNAVAILABLE.en);

    const on = visibleText(
      renderToStaticMarkup(<ReminderControl enabled={true} time="09:05" note="on" onChange={() => undefined} />),
    );
    expect(on).toContain('aria-pressed="true"');
    expect(on).toContain('value="09:05"');
    expect(on).toContain(REMINDER_ON.en);
    expect(on).toContain(REMINDER_ON.zh);

    const blocked = visibleText(
      renderToStaticMarkup(<ReminderControl enabled={false} time="09:05" note="denied" onChange={() => undefined} />),
    );
    expect(blocked).toContain(REMINDER_DENIED.en);
    expect(blocked).toContain(REMINDER_DENIED.zh);

    const unavailable = visibleText(
      renderToStaticMarkup(<ReminderControl enabled={false} time="09:05" note="unavailable" onChange={() => undefined} />),
    );
    expect(unavailable).toContain(REMINDER_UNAVAILABLE.en);
    expect(unavailable).toContain(REMINDER_UNAVAILABLE.zh);

    const waiting = visibleText(
      renderToStaticMarkup(<ReminderControl enabled={true} time="20:00" note="waiting" onChange={() => undefined} />),
    );
    expect(waiting).toContain(reminderWaitingCopy("20:00").en);
    expect(waiting).toContain(reminderWaitingCopy("20:00").zh);
    expect(waiting).not.toContain("Shanghai");

    const passed = visibleText(
      renderToStaticMarkup(<ReminderControl enabled={true} time="08:00" note="passed" onChange={() => undefined} />),
    );
    expect(passed).toContain(REMINDER_PASSED.en);
    expect(passed).toContain(REMINDER_PASSED.zh);
    expect(openReminderNote({ enabled: true, slotPassed: false, handledToday: false })).toBe("waiting");
    expect(openReminderNote({ enabled: true, slotPassed: true, handledToday: true })).toBe("passed");
    expect(openReminderNote({ enabled: false, slotPassed: true, handledToday: true, problem: "denied" })).toBe("denied");
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

  it("keeps the day streak out of the card until a stored day task exists", () => {
    const panel = (session: SessionTally) =>
      renderToStaticMarkup(
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
            session,
            lineOutcome: null,
            resetSession: () => undefined,
          } as Parameters<typeof PracticePanel>[0])}
        />,
      );

    const hidden = panel(emptySession());
    expect(hidden).not.toContain('id="streak-strip"');
    expect(hidden).not.toContain('id="streak-chrome"');
    expect(hidden).not.toContain("Streak");
    expect(hidden.indexOf('id="session-strip"')).toBeGreaterThan(-1);

    const one = panel({ clear: 1, partial: 0, unsure: 0, streak: 1, started: true });
    expect(one).not.toContain('id="streak-strip"');
    expect(one).not.toMatch(/Streak ×/);

    const html = panel({ clear: 1, partial: 1, unsure: 0, streak: 1, started: true });
    expect(html.indexOf('id="session-strip"')).toBeGreaterThan(-1);
    expect(html).not.toContain('id="streak-strip"');
    expect(html).not.toContain("streak-footer");
    expect(html).toContain('id="hear"');
    expect(html).toContain('id="say"');
    expect(html).not.toContain('id="reminder-control"');
    expect(html).not.toContain('id="reminders"');
    expect(html).not.toContain("Remind me daily");
    expect(html).not.toContain("On iPhone, Echo can't ring");
    expect(html).not.toContain('id="milestone-toast"');

    const zh = visibleText(
      renderToStaticMarkup(<MilestoneToast day={7} lang="zh" onDismiss={() => undefined} />),
    );
    expect(zh.indexOf("听和说了一周")).toBeLessThan(zh.indexOf("A week of listening and speaking"));
  });
});

describe("streak chrome wiring", () => {
  it("reads Kai's hooks and does not keep a stub store", () => {
    expect(existsSync(new URL("../src/streak/stub.ts", import.meta.url))).toBe(false);
    expect(existsSync(new URL("../src/ui/streakActions.ts", import.meta.url))).toBe(false);

    const chrome = readFileSync(new URL("../src/components/StreakChrome.tsx", import.meta.url), "utf8");
    expect(chrome).toContain("usePracticeStreak");
    expect(chrome).toContain("milestoneJustHit");
    expect(chrome).not.toContain("useReminderSettings");
    expect(chrome).not.toContain("enableDailyReminder");
    expect(chrome).not.toContain("disableDailyReminder");
    expect(chrome).not.toContain("recordPracticeClearOrPartial");
    expect(chrome).not.toMatch(/\blocalStorage\b/);

    const settings = readFileSync(new URL("../src/components/SettingsSheet.tsx", import.meta.url), "utf8");
    expect(settings).toContain("useReminderSettings");
    expect(settings).toContain("enableDailyReminder");
    expect(settings).toContain("disableDailyReminder");
    expect(settings).toContain("armNativeReminder(");
    expect(settings).toContain("isAndroidShell()");
    expect(settings).not.toContain("syncNativeReminders()");
    expect(settings).not.toContain("recordPracticeClearOrPartial");
    expect(settings).not.toMatch(/\blocalStorage\b/);

    for (const file of [
      "../src/components/StreakFlame.tsx",
      "../src/components/ReminderControl.tsx",
      "../src/components/MilestoneToast.tsx",
      "../src/components/PracticePanel.tsx",
    ]) {
      const src = readFileSync(new URL(file, import.meta.url), "utf8");
      expect(src, file).not.toContain("recordPracticeClearOrPartial");
      expect(src, file).not.toMatch(/\blocalStorage\b/);
      expect(src, file).not.toMatch(/Capacitor/);
    }

    const idle = renderToStaticMarkup(<StreakChrome lang="en" session={emptySession()} />);
    expect(idle).toBe("");
    const shown = renderToStaticMarkup(
      <StreakChrome lang="en" session={{ clear: 2, partial: 0, unsure: 0, streak: 2, started: true }} />,
    );
    expect(shown).not.toContain('id="streak-strip"');
    expect(idle).not.toContain('id="reminder-time"');
    expect(idle).not.toContain('id="reminder-control"');
    expect(idle).not.toContain('id="milestone-toast"');
  });
});
