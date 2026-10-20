import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SettingsSheet } from "../src/components/SettingsSheet";
import { REMINDER_HONESTY, REMINDER_LABEL } from "../src/ui/streakCopy";
import { SITE_DESCRIPTION_ZH } from "../src/ui/seo";

function visible(html: string): string {
  return html.replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&");
}

describe("settings reminder", () => {
  it("keeps one daily reminder, one time, and one short honesty line", () => {
    const html = visible(renderToStaticMarkup(<SettingsSheet open onClose={() => undefined} />));
    expect(html).toContain('id="settings-sheet"');
    expect(html).toContain('role="dialog"');
    expect(html.match(/id="reminder-toggle"/g)).toHaveLength(1);
    expect(html.match(/id="reminder-time"/g)).toHaveLength(1);
    expect(html.match(/type="time"/g)).toHaveLength(1);
    expect(html).toContain(REMINDER_LABEL.en);
    expect(html).toContain(REMINDER_LABEL.zh);
    expect(html).toContain(REMINDER_HONESTY.en);
    expect(html).toContain(REMINDER_HONESTY.zh);
    expect(html.match(new RegExp(REMINDER_HONESTY.en.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"))).toHaveLength(1);
    expect(html).toContain('aria-label="Reminder time, local"');
    expect(html).not.toContain("The time is Shanghai time");
    expect(html).not.toContain("时间按上海");
    expect(html).not.toContain("A Shanghai day counts");
    expect(html).not.toContain("After the time passes, open Echo again");
    expect(html).not.toContain(SITE_DESCRIPTION_ZH);
    expect(html.match(/id="theme-dark"/g)).toHaveLength(1);
    expect(html.match(/id="theme-light"/g)).toHaveLength(1);
    expect(html).toContain(">Dark<");
    expect(html).toContain(">Light<");
    expect(html).toContain("亮色");
    expect(html).toContain('id="help"');
    expect(html).toContain("Help");
    expect(html).toContain("帮助");
    expect(html).toContain("微信里打开时，麦克风可能用不了");
    expect(html).toContain('href="mailto:dsarangi7@gmail.com"');
    expect(html).toContain("dsarangi7@gmail.com");
    const dark = html.slice(html.indexOf('id="theme-dark"'), html.indexOf('id="theme-light"'));
    const light = html.slice(html.indexOf('id="theme-light"'));
    expect(dark).toContain('aria-pressed="true"');
    expect(light).toContain('aria-pressed="false"');
  });

  it("stays closed until Settings is opened, and does not sit on the practice card", () => {
    const closed = renderToStaticMarkup(<SettingsSheet open={false} onClose={() => undefined} />);
    expect(closed).toBe("");

    const app = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
    const panel = readFileSync(new URL("../src/components/PracticePanel.tsx", import.meta.url), "utf8");
    expect(app).toContain("<SettingsSheet");
    expect(app).not.toContain("ReminderCard");
    expect(app.match(/id="open-settings"/g)).toHaveLength(1);
    expect(app).toContain('className="settings-gear"');
    expect(app).toContain('aria-label="Settings. 设置"');
    expect(app).not.toContain(">Settings<");
    expect(app).not.toContain("Remind me daily");
    expect(app).not.toContain('id="theme-dark"');
    expect(app).not.toContain("wechat-banner");
    expect(app).not.toContain("HelpBlock");
    expect(panel).not.toContain("wechat-banner");
    expect(app).not.toContain('id="reminder-toggle"');
    expect(app).not.toContain('id="reminders"');
    expect(panel).not.toContain("ReminderControl");
    expect(panel).not.toContain("ReminderCard");
    expect(panel).not.toContain("theme-dark");
    expect(panel).not.toContain("reminder-toggle");
    expect(panel).not.toContain("Reminders");
  });

  it("arms the Android shell only after permission, and keeps the website on enableDailyReminder", () => {
    const src = readFileSync(new URL("../src/components/SettingsSheet.tsx", import.meta.url), "utf8");
    expect(src).toContain("isAndroidShell()");
    expect(src).toContain("armNativeReminder(");
    expect(src).toContain("enableDailyReminder");
    expect(src).toContain("disableDailyReminder");
    expect(src).not.toContain("syncNativeReminders()");
    expect(src).not.toContain("The time is Shanghai time");
  });
});
