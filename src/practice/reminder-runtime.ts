import {
  REMINDER_CHANGED_EVENT,
  REMINDER_SYNC_TAG,
  commitDelivery,
  dueNotices,
  loadReminder,
  markNoticeShown,
  mergeSnapshots,
  nextReminderCheck,
  saveReminderSettings,
  snapshotFromStorage,
  writeReminderState,
  type DueNotice,
  type ReminderState,
} from "./reminder";
import { parseReminderTime } from "./shanghai";
import { STREAK_CHANGED_EVENT, practiceLocalStorage } from "./streak";
import { readSnapshot, writeSnapshot } from "./sync-idb";

/** Minimum Chrome will honor for Periodic Background Sync. The browser may wait longer. */
export const PERIODIC_SYNC_MIN_MS = 12 * 60 * 60 * 1000;
const RETRY_MS = 15 * 60 * 1000;
const MAX_TIMER_MS = 2_147_483_647;

export type ReminderEnableResult =
  | { ok: true }
  | { ok: false; reason: "invalid-time" | "unsupported" | "denied" | "storage" };

export function reminderPermission(): NotificationPermission | "unsupported" {
  if (typeof Notification === "undefined") return "unsupported";
  return Notification.permission;
}

type PeriodicSyncManager = {
  register: (tag: string, options?: { minInterval?: number }) => Promise<void>;
  unregister: (tag: string) => Promise<void>;
  getTags: () => Promise<string[]>;
};

function periodicSyncOf(registration: ServiceWorkerRegistration | undefined): PeriodicSyncManager | null {
  if (!registration) return null;
  const maybe = registration as ServiceWorkerRegistration & { periodicSync?: PeriodicSyncManager };
  return maybe.periodicSync ?? null;
}

function notificationsGranted(): boolean {
  return typeof Notification !== "undefined" && Notification.permission === "granted";
}

async function showNotice(notice: DueNotice): Promise<boolean> {
  const options: NotificationOptions = {
    body: notice.body,
    tag: notice.kind === "daily" ? "echo-daily" : "echo-weekly",
    lang: "zh-CN",
  };
  try {
    if (typeof navigator !== "undefined" && navigator.serviceWorker) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration?.active) {
        await registration.showNotification(notice.title, options);
        return true;
      }
    }
  } catch {
    /* The page constructor below is the fallback while no worker controls the page. */
  }
  try {
    new Notification(notice.title, options);
    return true;
  } catch {
    return false;
  }
}

async function registerPeriodicSync(enabled: boolean): Promise<void> {
  if (typeof navigator === "undefined" || !navigator.serviceWorker) return;
  let registration: ServiceWorkerRegistration | undefined;
  try {
    registration = await navigator.serviceWorker.getRegistration();
  } catch {
    return;
  }
  const periodic = periodicSyncOf(registration);
  if (!periodic) return;
  try {
    if (!enabled || !notificationsGranted()) {
      await periodic.unregister(REMINDER_SYNC_TAG);
      return;
    }
    const status = await navigator.permissions.query({ name: "periodic-background-sync" as PermissionName });
    if (status.state !== "granted") return;
    const tags = await periodic.getTags();
    if (!tags.includes(REMINDER_SYNC_TAG)) {
      await periodic.register(REMINDER_SYNC_TAG, { minInterval: PERIODIC_SYNC_MIN_MS });
    }
  } catch {
    /* iOS Safari, desktop Safari, and most uninstalled tabs throw or deny this. */
  }
}

/**
 * Pull delivery marks the worker stored, show anything that is due, and mirror
 * the page state into IndexedDB for the next background wake.
 * Returns the epoch ms of the next in-page check, or null when the reminder is off.
 */
export async function syncReminderNow(isCurrent: () => boolean = () => true): Promise<number | null> {
  const storage = practiceLocalStorage();
  if (!storage || !isCurrent()) return null;
  const remote = await readSnapshot().catch(() => null);
  const merged = mergeSnapshots(snapshotFromStorage(storage), remote);
  let reminder = loadReminder(storage);
  if (
    merged.reminder.lastDailyDay !== reminder.lastDailyDay ||
    merged.reminder.lastWeeklyWeekStart !== reminder.lastWeeklyWeekStart
  ) {
    reminder = writeReminderState(storage, { ...reminder, ...merged.reminder, enabled: reminder.enabled, time: reminder.time });
  }
  if (!isCurrent()) return null;

  const snapshot = snapshotFromStorage(storage);
  const notices = dueNotices(snapshot.reminder, snapshot.practiceDays, new Date());
  if (notices.length) {
    if (!notificationsGranted()) {
      await writeSnapshot(snapshot).catch(() => undefined);
      await registerPeriodicSync(snapshot.reminder.enabled);
      return Date.now() + RETRY_MS;
    }
    let marked = snapshot.reminder;
    for (const notice of notices) {
      if (!isCurrent()) return null;
      const shown = await showNotice(notice);
      if (!shown) {
        writeReminderState(storage, marked);
        await writeSnapshot(snapshotFromStorage(storage)).catch(() => undefined);
        return Date.now() + RETRY_MS;
      }
      marked = markNoticeShown(marked, notice);
      writeReminderState(storage, marked);
    }
  }

  const fresh = await readSnapshot().catch(() => null);
  const page = snapshotFromStorage(storage);
  const committed = commitDelivery(page, fresh) ?? page;
  if (
    committed.reminder.lastDailyDay !== page.reminder.lastDailyDay ||
    committed.reminder.lastWeeklyWeekStart !== page.reminder.lastWeeklyWeekStart
  ) {
    writeReminderState(storage, {
      ...page.reminder,
      lastDailyDay: committed.reminder.lastDailyDay,
      lastWeeklyWeekStart: committed.reminder.lastWeeklyWeekStart,
    });
  }
  await writeSnapshot(snapshotFromStorage(storage)).catch(() => undefined);
  await registerPeriodicSync(loadReminder(storage).enabled);
  if (!loadReminder(storage).enabled) return null;
  const next = nextReminderCheck(loadReminder(storage), snapshotFromStorage(storage).practiceDays, new Date());
  return next;
}

export async function publishPracticeSnapshot(): Promise<void> {
  try {
    await syncReminderNow();
  } catch {
    /* IndexedDB or notifications are unavailable. The streak itself is already stored. */
  }
}

/**
 * Call from Chan's enable control, inside the click. Asks for notification
 * permission, stores the Shanghai clock time, and arms delivery.
 */
export async function enableDailyReminder(time: string): Promise<ReminderEnableResult> {
  const parsed = parseReminderTime(time);
  if (!parsed) return { ok: false, reason: "invalid-time" };
  const storage = practiceLocalStorage();
  if (!storage) return { ok: false, reason: "storage" };
  if (typeof Notification === "undefined") {
    saveReminderSettings(storage, { enabled: false, time: parsed });
    return { ok: false, reason: "unsupported" };
  }
  let permission = Notification.permission;
  if (permission !== "granted") {
    try {
      permission = await Notification.requestPermission();
    } catch {
      permission = "denied";
    }
  }
  if (permission !== "granted") {
    saveReminderSettings(storage, { enabled: false, time: parsed });
    void publishPracticeSnapshot();
    return { ok: false, reason: "denied" };
  }
  saveReminderSettings(storage, { enabled: true, time: parsed });
  void publishPracticeSnapshot();
  return { ok: true };
}

export function disableDailyReminder(): ReminderState | null {
  const storage = practiceLocalStorage();
  if (!storage) return null;
  const current = loadReminder(storage);
  const next = saveReminderSettings(storage, { enabled: false, time: current.time });
  void publishPracticeSnapshot();
  return next;
}

/** In-page timer plus a refresh when the tab becomes visible. Safe to call once from App. */
export function startReminderRuntime(): () => void {
  if (typeof window === "undefined") return () => undefined;
  let stopped = false;
  let timer = 0;
  let running = false;
  let queued = false;
  const isCurrent = () => !stopped;

  const schedule = (at: number | null) => {
    window.clearTimeout(timer);
    if (stopped || at == null) return;
    const delay = at <= Date.now() ? RETRY_MS : Math.min(MAX_TIMER_MS, Math.max(1000, at - Date.now()));
    timer = window.setTimeout(() => {
      void tick();
    }, delay);
  };

  const tick = async () => {
    if (stopped) return;
    if (running) {
      queued = true;
      return;
    }
    running = true;
    try {
      do {
        queued = false;
        const next = await syncReminderNow(isCurrent);
        if (stopped) return;
        schedule(next);
      } while (queued && !stopped);
    } catch {
      if (!stopped) schedule(Date.now() + RETRY_MS);
    } finally {
      running = false;
    }
  };

  const onWake = () => {
    if (document.visibilityState === "hidden") return;
    void tick();
  };

  const onPracticeSignal = () => {
    void tick();
  };

  document.addEventListener("visibilitychange", onWake);
  window.addEventListener("focus", onWake);
  window.addEventListener(STREAK_CHANGED_EVENT, onPracticeSignal);
  window.addEventListener(REMINDER_CHANGED_EVENT, onPracticeSignal);
  void tick();

  return () => {
    stopped = true;
    window.clearTimeout(timer);
    document.removeEventListener("visibilitychange", onWake);
    window.removeEventListener("focus", onWake);
    window.removeEventListener(STREAK_CHANGED_EVENT, onPracticeSignal);
    window.removeEventListener(REMINDER_CHANGED_EVENT, onPracticeSignal);
  };
}
