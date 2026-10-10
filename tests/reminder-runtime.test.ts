import { afterEach, describe, expect, it, vi } from "vitest";
import { loadReminder, reminderProofCopy } from "../src/practice/reminder";
import {
  deliverNotification,
  enableDailyReminder,
  prefersPageNotification,
  startReminderRuntime,
} from "../src/practice/reminder-runtime";

function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear() {
      map.clear();
    },
    getItem(key: string) {
      return map.has(key) ? map.get(key)! : null;
    },
    key(index: number) {
      return [...map.keys()][index] ?? null;
    },
    removeItem(key: string) {
      map.delete(key);
    },
    setItem(key: string, value: string) {
      map.set(key, String(value));
    },
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("reminder delivery", () => {
  it("uses the page notification on iOS before the service worker", async () => {
    const order: string[] = [];
    const shown = await deliverNotification("课猫 Echo", { body: "nudge" }, {
      pageFirst: true,
      showPage() {
        order.push("page");
        return false;
      },
      async showWorker() {
        order.push("worker");
        return true;
      },
    });
    expect(shown).toBe(true);
    expect(order).toEqual(["page", "worker"]);
    expect(prefersPageNotification("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)", 5)).toBe(true);
    expect(prefersPageNotification("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", 5)).toBe(true);
    expect(prefersPageNotification("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", 0)).toBe(false);
    expect(prefersPageNotification("Mozilla/5.0 (Linux; Android 14; Pixel)", 5)).toBe(false);
  });

  it("keeps the service worker first when the page is not iOS", async () => {
    const order: string[] = [];
    const shown = await deliverNotification("课猫 Echo", { body: "nudge" }, {
      pageFirst: false,
      showPage() {
        order.push("page");
        return true;
      },
      async showWorker() {
        order.push("worker");
        return false;
      },
    });
    expect(shown).toBe(true);
    expect(order).toEqual(["worker", "page"]);
  });

  it("wakes on pageshow as well as visibility and focus", () => {
    const seen = new Set<string>();
    const listeners = new Map<string, EventListener>();
    const host = {
      addEventListener(type: string, fn: EventListener) {
        seen.add(type);
        listeners.set(type, fn);
      },
      removeEventListener(type: string) {
        listeners.delete(type);
      },
      setTimeout() {
        return 1;
      },
      clearTimeout() {
        return undefined;
      },
    };
    vi.stubGlobal("window", host);
    vi.stubGlobal("document", { visibilityState: "visible", addEventListener: host.addEventListener, removeEventListener: host.removeEventListener });
    const stop = startReminderRuntime();
    expect(seen.has("pageshow")).toBe(true);
    expect(seen.has("focus")).toBe(true);
    expect(seen.has("visibilitychange")).toBe(true);
    stop();
    expect(listeners.has("pageshow")).toBe(false);
  });

  it("proves permission when today's local time already passed, and stays quiet before it", async () => {
    const storage = memoryStorage();
    const shown: string[] = [];
    vi.stubGlobal("localStorage", storage);
    vi.stubGlobal("navigator", {
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X)",
      maxTouchPoints: 5,
      serviceWorker: undefined,
    });
    vi.stubGlobal(
      "Notification",
      class {
        static permission = "granted";
        static requestPermission = async () => "granted" as NotificationPermission;
        constructor(_title: string, options?: NotificationOptions) {
          shown.push(options?.body ?? "");
        }
      },
    );

    const now = new Date();
    const ahead = new Date(now.getTime() + 30 * 60 * 1000);
    if (ahead.getDate() === now.getDate()) {
      const earlyTime = `${String(ahead.getHours()).padStart(2, "0")}:${String(ahead.getMinutes()).padStart(2, "0")}`;
      const early = await enableDailyReminder(earlyTime, now);
      expect(early).toEqual({ ok: true });
      expect(shown).toEqual([]);
      expect(loadReminder(storage).lastDailyDay).toBeNull();
      storage.clear();
      shown.length = 0;
    }

    const late = await enableDailyReminder("00:00", now);
    expect(late).toEqual({ ok: true });
    expect(shown).toEqual([reminderProofCopy().body]);
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    expect(loadReminder(storage).lastDailyDay).toBe(today);
  });
});
