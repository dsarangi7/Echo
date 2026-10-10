import { existsSync, readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MilestoneToast } from "../src/components/MilestoneToast";
import { PracticePanel } from "../src/components/PracticePanel";
import { ReminderControl } from "../src/components/ReminderControl";
import { StreakChrome } from "../src/components/StreakChrome";
import { StreakFlame } from "../src/components/StreakFlame";
import { emptySession } from "../src/practice/session";
import { milestoneForDays, STREAK_CHANGED_EVENT } from "../src/practice/streak";
import type { Sentence } from "../src/practice/types";
import {
  MILESTONE_COPY,
  REMINDER_DENIED,
  REMINDER_LABEL,
  REMINDER_ON,
  REMINDER_PWA,
  REMINDER_UNAVAILABLE,
  milestoneJustHit,
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
    const off = renderToStaticMarkup(
      <ReminderControl enabled={false} time="20:00" note="idle" onChange={() => undefined} />,
    );
    expect(off).toContain(REMINDER_LABEL.en);
    expect(off).toContain(REMINDER_LABEL.zh);
    expect(off).toContain('id="reminder-toggle"');
    expect(off).toContain('aria-pressed="false"');
    expect(off).toContain('type="time"');
    expect(off).toContain('value="20:00"');
    expect(off).toContain(REMINDER_PWA.en);
    expect(off).toContain(REMINDER_PWA.zh);
    expect(off).not.toContain(REMINDER_ON.en);
    expect(off).not.toContain(REMINDER_UNAVAILABLE.en);

    const on = renderToStaticMarkup(
      <ReminderControl enabled={true} time="09:05" note="on" onChange={() => undefined} />,
    );
    expect(on).toContain('aria-pressed="true"');
    expect(on).toContain('value="09:05"');
    expect(on).toContain(REMINDER_ON.en);
    expect(on).toContain(REMINDER_ON.zh);

    const blocked = renderToStaticMarkup(
      <ReminderControl enabled={false} time="09:05" note="denied" onChange={() => undefined} />,
    );
    expect(blocked).toContain(REMINDER_DENIED.en);
    expect(blocked).toContain(REMINDER_DENIED.zh);

    const unavailable = renderToStaticMarkup(
      <ReminderControl enabled={false} time="09:05" note="unavailable" onChange={() => undefined} />,
    );
    expect(unavailable).toContain(REMINDER_UNAVAILABLE.en);
    expect(unavailable).toContain(REMINDER_UNAVAILABLE.zh);
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

  it("places the chrome above the session strip without a toast until a milestone is hit", () => {
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
    expect(html).toContain(REMINDER_LABEL.en);
    expect(html).not.toContain('id="milestone-toast"');

    const zh = visibleText(
      renderToStaticMarkup(<MilestoneToast day={7} lang="zh" onDismiss={() => undefined} />),
    );
    expect(zh.indexOf("整整一周")).toBeLessThan(zh.indexOf("A full week"));
  });
});

describe("streak chrome wiring", () => {
  it("reads Kai's hooks and does not keep a stub store", () => {
    expect(existsSync(new URL("../src/streak/stub.ts", import.meta.url))).toBe(false);
    expect(existsSync(new URL("../src/ui/streakActions.ts", import.meta.url))).toBe(false);

    const chrome = readFileSync(new URL("../src/components/StreakChrome.tsx", import.meta.url), "utf8");
    expect(chrome).toContain("usePracticeStreak");
    expect(chrome).toContain("useReminderSettings");
    expect(chrome).toContain("enableDailyReminder");
    expect(chrome).toContain("disableDailyReminder");
    expect(chrome).toContain("milestoneJustHit");
    expect(chrome).not.toContain("recordPracticeClearOrPartial");
    expect(chrome).not.toMatch(/\blocalStorage\b/);

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

    const idle = renderToStaticMarkup(<StreakChrome lang="en" />);
    expect(idle).toContain('id="streak-strip"');
    expect(idle).toContain('id="reminder-time"');
    expect(idle).not.toContain('id="milestone-toast"');
  });
});
