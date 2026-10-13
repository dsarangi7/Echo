import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  DARK_THEME_COLOR,
  LIGHT_THEME_COLOR,
  THEME_STORAGE_KEY,
  paintTheme,
  readSavedTheme,
  resolveTheme,
  saveTheme,
  themeColor,
} from "../src/ui/theme";

function memory() {
  const bag = new Map<string, string>();
  return {
    getItem(key: string) {
      return bag.has(key) ? bag.get(key)! : null;
    },
    setItem(key: string, value: string) {
      bag.set(key, value);
    },
  };
}

describe("theme preference", () => {
  it("follows the system until the user saves Dark or Light", () => {
    expect(resolveTheme(null, true)).toBe("dark");
    expect(resolveTheme(null, false)).toBe("light");
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
    expect(themeColor("dark")).toBe(DARK_THEME_COLOR);
    expect(themeColor("light")).toBe(LIGHT_THEME_COLOR);
  });

  it("ignores anything that is not dark or light", () => {
    const storage = memory();
    expect(readSavedTheme(storage)).toBeNull();
    storage.setItem(THEME_STORAGE_KEY, "bright");
    expect(readSavedTheme(storage)).toBeNull();
    saveTheme("light", storage);
    expect(readSavedTheme(storage)).toBe("light");
    expect(storage.getItem(THEME_STORAGE_KEY)).toBe("light");
  });

  it("paints the document theme and the browser chrome color", () => {
    const root = { dataset: {} as { theme?: string }, style: { colorScheme: "" } };
    const meta = { content: "", setAttribute(_name: string, value: string) { this.content = value; } };
    paintTheme("light", root, meta);
    expect(root.dataset.theme).toBe("light");
    expect(root.style.colorScheme).toBe("light");
    expect(meta.content).toBe(LIGHT_THEME_COLOR);
    paintTheme("dark", root, null);
    expect(root.dataset.theme).toBe("dark");
    expect(root.style.colorScheme).toBe("dark");
  });

  it("boots from the same storage key as the head script, before paint", () => {
    const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
    const theme = readFileSync(new URL("../src/ui/theme.ts", import.meta.url), "utf8");
    expect(html).toContain(`var key = "${THEME_STORAGE_KEY}"`);
    expect(html).toContain('matchMedia("(prefers-color-scheme: light)")');
    expect(html).toContain('name="theme-color" content="#121212"');
    expect(theme).toContain("prefers-color-scheme: light");
    expect(theme).not.toContain("echo-practice-reminder");
    expect(theme).not.toContain("echo-practice-streak");
  });
});
