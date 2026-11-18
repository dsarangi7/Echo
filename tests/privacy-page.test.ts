import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const page = readFileSync("public/privacy/index.html", "utf8");
const listing = readFileSync("docs/play-store-listing.md", "utf8");

describe("privacy policy page", () => {
  it("names the app, package, contact, and translator, in English and Chinese", () => {
    expect(page).toContain('lang="zh-CN"');
    expect(page).toContain("com.ayk.echo");
    expect(page).toContain("mailto:dsarangi7@gmail.com");
    expect(page).toContain("api.mymemory.translated.net");
    expect(page).toContain("RECORD_AUDIO");
    expect(page).toContain("SCHEDULE_EXACT_ALARM");
    expect(page).toContain("allowBackup");
    expect(page).toContain("麦克风");
    expect(page).not.toContain("USE_EXACT_ALARM</code> is used");
    expect(page).not.toMatch(/\+\d{8,}/);
  });
});

describe("Play listing draft", () => {
  it("keeps the package and version and does not include a phone number", () => {
    expect(listing).toContain("com.ayk.echo");
    expect(listing).toContain("versionCode");
    expect(listing).toContain("1.0.5");
    expect(listing).toContain("https://dsarangi7.github.io/Echo/privacy/");
    expect(listing).toContain("12 testers");
    expect(listing).toContain("merchant profile");
    expect(listing).not.toMatch(/\+\d{8,}/);
    expect(listing).not.toMatch(/storePassword\s*=\s*\S+/);
  });
});
