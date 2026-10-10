import { REMINDER_SYNC_TAG, commitDelivery, markNoticeShown, planBackgroundDelivery } from "./reminder";
import { readSnapshot, writeSnapshot } from "./sync-idb";

/**
 * Classic script bundled to /echo-sync.js and loaded by the Workbox service worker
 * with importScripts. Chrome Android (installed PWA) runs this from Periodic Background Sync.
 * It cannot promise a clock time. iOS never runs it.
 */
const sw = self as unknown as {
  addEventListener: (type: string, listener: (event: SyncEventLike) => void) => void;
  registration: {
    showNotification: (title: string, options: { body: string; tag: string; lang: string; data?: { href: string } }) => Promise<void>;
    scope: string;
  };
  clients: {
    matchAll: (options: { type: string; includeUncontrolled: boolean }) => Promise<Array<{ focus?: () => Promise<void> }>>;
    openWindow: (url: string) => Promise<unknown>;
  };
};

type SyncEventLike = {
  tag?: string;
  waitUntil?: (work: Promise<unknown>) => void;
  notification?: { close?: () => void; data?: { href?: string } };
};

sw.addEventListener("periodicsync", (event) => {
  if (event.tag !== REMINDER_SYNC_TAG) return;
  event.waitUntil?.(runReminderSync());
});

sw.addEventListener("notificationclick", (event) => {
  event.notification?.close?.();
  const href = event.notification?.data?.href || sw.registration.scope;
  event.waitUntil?.(openApp(href));
});

async function runReminderSync(): Promise<void> {
  const snap = await readSnapshot();
  if (!snap?.reminder.enabled) return;
  const planned = planBackgroundDelivery(snap, new Date());
  if (!planned.notices.length) return;
  let current = snap;
  for (const notice of planned.notices) {
    await sw.registration.showNotification(notice.title, {
      body: notice.body,
      tag: notice.kind === "daily" ? "echo-daily" : "echo-weekly",
      lang: "zh-CN",
      data: { href: sw.registration.scope },
    });
    const marked = { ...current, reminder: markNoticeShown(current.reminder, notice) };
    const fresh = await readSnapshot();
    const next = commitDelivery(marked, fresh);
    if (!next) return;
    current = next;
    await writeSnapshot(current);
  }
}

async function openApp(href: string): Promise<void> {
  const list = await sw.clients.matchAll({ type: "window", includeUncontrolled: true });
  for (const client of list) {
    if (client.focus) {
      await client.focus();
      return;
    }
  }
  await sw.clients.openWindow(href);
}
