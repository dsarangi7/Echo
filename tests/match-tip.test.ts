import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { MATCH_TIP_KEY, readMatchTipSeen, writeMatchTipSeen } from "../src/ui/matchTip";

function memory(): Storage {
  const bag = new Map<string, string>();
  return {
    get length() {
      return bag.size;
    },
    clear: () => bag.clear(),
    getItem: (key) => bag.get(key) ?? null,
    key: (index) => [...bag.keys()][index] ?? null,
    removeItem: (key) => {
      bag.delete(key);
    },
    setItem: (key, value) => {
      bag.set(key, value);
    },
  };
}

describe("matching tip", () => {
  it("shows once, then stays dismissed across reloads", () => {
    const store = memory();
    expect(readMatchTipSeen(store)).toBe(false);
    expect(readMatchTipSeen(null)).toBe(false);
    writeMatchTipSeen(store);
    expect(store.getItem(MATCH_TIP_KEY)).toBe("1");
    expect(readMatchTipSeen(store)).toBe(true);
  });

  it("is a one-time practice note, with no swipe instruction", () => {
    const panel = readFileSync("src/components/PracticePanel.tsx", "utf8");
    expect(panel).toContain("writeMatchTipSeen");
    expect(panel).toContain("MATCH_TIP_MS");
    expect(panel).toContain("dismissTip()");
    expect(panel).not.toContain("arrow keys");
    expect(panel).not.toContain("左右滑动");
    expect(panel).not.toContain("match-notes");
  });
});
