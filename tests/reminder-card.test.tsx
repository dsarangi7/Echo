import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ReminderCard } from "../src/components/ReminderCard";
import { REMINDER_IOS_HINT, REMINDER_LOCAL_TIME } from "../src/ui/streakCopy";

function visible(html: string): string {
  return html.replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&");
}

describe("reminder card", () => {
  it("says iPhone only nudges on the next open, at this device's local time", () => {
    const html = visible(renderToStaticMarkup(<ReminderCard />));
    expect(html).toContain(REMINDER_IOS_HINT.en);
    expect(html).toContain(REMINDER_IOS_HINT.zh);
    expect(html).toContain(REMINDER_LOCAL_TIME.en);
    expect(html).toContain(REMINDER_LOCAL_TIME.zh);
    expect(html).toContain('aria-label="Reminder time, local"');
    expect(html).not.toContain("The time is Shanghai time");
    expect(html).not.toContain("时间按上海");
    expect(html).toContain("A Shanghai day counts");
  });

  it("leaves the Android shell on syncNativeReminders", () => {
    const src = readFileSync(new URL("../src/components/ReminderCard.tsx", import.meta.url), "utf8");
    expect(src).toContain("isAndroidShell()");
    expect(src).toContain("syncNativeReminders()");
    expect(src).toContain("enableDailyReminder");
    expect(src).not.toContain("The time is Shanghai time");
  });
});
