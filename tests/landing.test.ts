import { describe, expect, it } from "vitest";
import {
  APP_MODE_KEY,
  LANDING_DISMISSED_KEY,
  clearLandingDismissed,
  readAppMode,
  readLandingDismissed,
  writeAppMode,
  writeLandingDismissed,
} from "../src/ui/landing";

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

describe("echo landing", () => {
  it("shows once, then stays dismissed across reloads", () => {
    const store = memory();
    expect(readLandingDismissed(store)).toBe(false);
    expect(readLandingDismissed(null)).toBe(false);
    writeLandingDismissed(store);
    expect(store.getItem(LANDING_DISMISSED_KEY)).toBe("1");
    expect(readLandingDismissed(store)).toBe(true);
    clearLandingDismissed(store);
    expect(readLandingDismissed(store)).toBe(false);
  });

  it("remembers practice, translate, and word decks", () => {
    const store = memory();
    expect(readAppMode(store)).toBe("practice");
    expect(readAppMode(null)).toBe("practice");
    writeAppMode(store, "translate");
    expect(store.getItem(APP_MODE_KEY)).toBe("translate");
    expect(readAppMode(store)).toBe("translate");
    writeAppMode(store, "words");
    expect(readAppMode(store)).toBe("words");
    writeAppMode(store, "practice");
    expect(readAppMode(store)).toBe("practice");
    store.setItem(APP_MODE_KEY, "nope");
    expect(readAppMode(store)).toBe("practice");
  });
});