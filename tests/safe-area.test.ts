import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("src/index.css", "utf8");

describe("status bar safe area", () => {
  it("uses Capacitor's inset, then env(), and does not add them", () => {
    expect(css).toContain("--safe-area-inset-top: env(safe-area-inset-top, 0px)");
    expect(css).toContain("--safe-area-inset-right: env(safe-area-inset-right, 0px)");
    expect(css).toContain("--safe-area-inset-bottom: env(safe-area-inset-bottom, 0px)");
    expect(css).toContain("--safe-area-inset-left: env(safe-area-inset-left, 0px)");
    expect(css.match(/env\(safe-area-inset-top/g)).toHaveLength(1);
    expect(css.match(/env\(safe-area-inset-bottom/g)).toHaveLength(1);
    expect(css).toContain("calc(14px + var(--safe-area-inset-top))");
    expect(css).toContain("calc(28px + var(--safe-area-inset-top))");
    expect(css).not.toMatch(/env\(safe-area-inset-top[^)]*\)\s*\+\s*var\(--safe-area-inset-top\)/);
    expect(css).not.toMatch(/var\(--safe-area-inset-top\)\s*\+\s*env\(safe-area-inset-top/);
  });
});
