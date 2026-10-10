import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BrowserBanner } from "../src/components/BrowserBanner";
import { ModelInterstitialCard } from "../src/components/ModelInterstitial";
import { SessionStrip } from "../src/components/SessionStrip";
import { TargetSentence } from "../src/components/TargetSentence";
import { UNSURE_TIP, feedbackLines } from "../src/practice/feedback";
import {
  applyOutcome,
  classifyAttempt,
  classifyLine,
  emptySession,
  loadSession,
  saveSession,
  type SessionTally,
} from "../src/practice/session";
import { formatDownloadMeter, formatMegabytes } from "../src/speech/model";
import {
  FIRST_VISIT_TIP,
  detectInAppBrowser,
  inAppBannerCopy,
  loadBrowserTipSeen,
  pageHttpsUrl,
  saveBrowserTipSeen,
} from "../src/ui/inAppBrowser";
import {
  INTERSTITIAL_BODY,
  INTERSTITIAL_TITLE,
  dismissInterstitialAfterSuccess,
  loadInterstitialDismissed,
  shouldShowDownloadInterstitial,
} from "../src/ui/modelInterstitial";

function memoryStorage(initial?: Record<string, string>): Storage {
  const map = new Map(Object.entries(initial ?? {}));
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

describe("session tally", () => {
  it("keeps mic unsure off the clear and partial counts and holds the streak", () => {
    let tally = emptySession();
    tally = applyOutcome(tally, "clear");
    tally = applyOutcome(tally, "clear");
    tally = applyOutcome(tally, "recognition_fail");
    tally = applyOutcome(tally, "partial");
    expect(tally).toEqual({ clear: 2, partial: 1, unsure: 1, streak: 2, started: true });
    const missed = applyOutcome(tally, "miss");
    expect(missed.clear).toBe(2);
    expect(missed.partial).toBe(1);
    expect(missed.streak).toBe(0);
    expect(missed.unsure).toBe(1);
    const again = applyOutcome(missed, "recognition_fail");
    expect(again.unsure).toBe(2);
    expect(again.clear).toBe(2);
    expect(again.partial).toBe(1);
    expect(again.streak).toBe(0);
  });

  it("treats an empty transcript as mic unsure unless the grader already set an outcome", () => {
    expect(classifyLine({ good: 0, total: 6 }, "")).toBe("recognition_fail");
    expect(classifyLine({ good: 0, total: 6 }, "   ")).toBe("recognition_fail");
    expect(classifyLine({ good: 0, total: 6 }, "nope")).toBe("miss");
    expect(classifyLine({ good: 6, total: 6 }, "all of them")).toBe("clear");
    expect(classifyLine({ good: 2, total: 6 }, "some")).toBe("partial");
    expect(
      classifyAttempt({ good: 6, total: 6, recognitionFailed: false, outcome: "recognition_fail" }),
    ).toBe("recognition_fail");
    expect(classifyAttempt({ good: 0, total: 4, recognitionFailed: true, outcome: "miss" })).toBe("miss");
  });

  it("remembers the tally in session storage and can reset", () => {
    const storage = memoryStorage();
    const tally: SessionTally = { clear: 3, partial: 2, unsure: 1, streak: 4, started: true };
    saveSession(storage, tally);
    expect(loadSession(storage)).toEqual(tally);
    saveSession(storage, emptySession());
    expect(loadSession(storage)).toEqual(emptySession());
    expect(loadSession(memoryStorage({ "echo-session-tally": "{" }))).toEqual(emptySession());
  });
});

describe("hero copy", () => {
  const tally: SessionTally = { clear: 3, partial: 2, unsure: 1, streak: 3, started: true };

  it("uses the session sheet strings", () => {
    expect(feedbackLines("start", emptySession())).toEqual({
      en: [
        "Let's practice — listen first if you want.",
        "Stars track clear lines. Mic glitches don't count against you.",
      ],
      zh: ["开始练习吧——想先听也可以。", "星星只记听清说对的句子；识别不准不算你的错。"],
    });
    expect(feedbackLines("clear", tally).en[0]).toBe("Nice — clear match. Streak ×3.");
    expect(feedbackLines("clear", tally).zh[0]).toBe("很棒，对上了。连续 ×3。");
    expect(feedbackLines("partial", tally)).toEqual({
      en: ["Partly there — Hear it, then try again.", "Streak holds."],
      zh: ["对上一部分了——先听一遍，再试一次。", "连击还在。"],
    });
    expect(feedbackLines("miss", tally)).toEqual({
      en: ["Not quite — Hear it once, then Say it again.", "Streak resets; that's okay."],
      zh: ["还差一点——先听，再说一次。", "连击重置没关系。"],
    });
    expect(feedbackLines("recognition_fail", tally)).toEqual({
      en: ["Mic may have misheard — not on you.", "Hear it, then Say it again. Streak safe."],
      zh: ["可能是识别听错了——不是你的问题。", "连击保留。"],
    });
    expect(feedbackLines("end", tally)).toEqual({
      en: ["Session: 3 clear · 2 partial · 1 mic unsure.", "No accent score — just word/字 matches."],
      zh: ["本局：听清 3 · 部分 2 · 识别不准 1。"],
    });
    expect(UNSURE_TIP.en).toBe("Usually Whisper misheard — Hear it, try again — not counted against you.");
  });

  it("never calls a soft miss wrong, failed, or an accent percent", () => {
    const blobs = [
      ...Object.values(feedbackLines("start", tally)),
      ...Object.values(feedbackLines("clear", tally)),
      ...Object.values(feedbackLines("partial", tally)),
      ...Object.values(feedbackLines("miss", tally)),
      ...Object.values(feedbackLines("recognition_fail", tally)),
      ...Object.values(feedbackLines("end", tally)),
      [UNSURE_TIP.en, UNSURE_TIP.zh],
    ].flat();
    for (const line of blobs) {
      expect(line).not.toMatch(/wrong|failed|bad accent|fluency/i);
      expect(line).not.toMatch(/\d+\s*%/);
    }
  });
});

describe("download interstitial", () => {
  it("shows percent and approximate megabytes when sizes are known", () => {
    const files = new Map([
      ["encoder", { loaded: 5 * 1024 * 1024, total: 10 * 1024 * 1024 }],
      ["decoder", { loaded: 15 * 1024 * 1024, total: 30 * 1024 * 1024 }],
    ]);
    expect(formatMegabytes(21.4 * 1024 * 1024)).toBe("21.4 MB");
    expect(formatDownloadMeter(files)).toBe("50% · 20.0 MB / 40.0 MB");
    expect(formatDownloadMeter(new Map())).toBeNull();
  });

  it("waits out a fast cache hit, then offers don't-show-again only after success", () => {
    const hidden = { dismissed: false, hearFirst: false, phase: "loading" as const, elapsedMs: 100, sawPartial: false, latched: false };
    expect(shouldShowDownloadInterstitial(hidden)).toEqual({ show: false });
    expect(shouldShowDownloadInterstitial({ ...hidden, sawPartial: true })).toEqual({ show: true, mode: "download" });
    expect(shouldShowDownloadInterstitial({ ...hidden, elapsedMs: 400 })).toEqual({ show: true, mode: "download" });
    expect(shouldShowDownloadInterstitial({ ...hidden, phase: "ready", latched: false })).toEqual({ show: false });
    expect(shouldShowDownloadInterstitial({ ...hidden, phase: "ready", latched: true })).toEqual({ show: true, mode: "success" });
    expect(shouldShowDownloadInterstitial({ ...hidden, phase: "ready", latched: true, hearFirst: true })).toEqual({ show: false });
    expect(shouldShowDownloadInterstitial({ ...hidden, phase: "error" })).toEqual({ show: true, mode: "error" });

    const storage = memoryStorage();
    expect(dismissInterstitialAfterSuccess(storage, "loading")).toBe(false);
    expect(loadInterstitialDismissed(storage)).toBe(false);
    expect(dismissInterstitialAfterSuccess(storage, "ready")).toBe(true);
    expect(loadInterstitialDismissed(storage)).toBe(true);
    expect(shouldShowDownloadInterstitial({ ...hidden, dismissed: true, phase: "loading", elapsedMs: 5000 })).toEqual({
      show: false,
    });
  });

  it("renders the wifi and hear-first copy without a modal lock", () => {
    const html = renderToStaticMarkup(
      <ModelInterstitialCard
        mode="download"
        meter="50% · 21.4 MB / 42.8 MB"
        pct={50}
        onContinue={() => undefined}
        onHearFirst={() => undefined}
        onDismiss={() => undefined}
      />,
    );
    expect(html).toContain(INTERSTITIAL_TITLE);
    expect(html).toContain("一次性语音模型（约 44 MB）");
    expect(html).toContain(INTERSTITIAL_BODY);
    expect(html).toContain("听一听现在就能用");
    expect(html).toContain("50% · 21.4 MB / 42.8 MB");
    expect(html).toContain("Continue download");
    expect(html).toContain("Hear it first");
    expect(html).not.toContain("Don't show again");
    expect(html).not.toContain('aria-modal="true"');

    const done = renderToStaticMarkup(
      <ModelInterstitialCard
        mode="success"
        meter={null}
        pct={null}
        onContinue={() => undefined}
        onHearFirst={() => undefined}
        onDismiss={() => undefined}
      />,
    );
    expect(done).toContain("show again after success");
    expect(done).toContain("成功后不再显示");
    expect(done).not.toContain("Continue download");
  });
});

describe("WeChat and WeCom banner", () => {
  it("detects in-app browsers and keeps the https link copyable", () => {
    expect(detectInAppBrowser("Mozilla/5.0 MicroMessenger/8.0.1")).toBe("wechat");
    expect(detectInAppBrowser("Mozilla/5.0 wxwork/4.1 MicroMessenger/7.0")).toBe("wecom");
    expect(detectInAppBrowser("Mozilla/5.0 WeCom/4.0")).toBe("wecom");
    expect(detectInAppBrowser("Mozilla/5.0 Chrome/120.0")).toBeNull();
    expect(pageHttpsUrl("https://dsarangi7.github.io/Echo/")).toBe("https://dsarangi7.github.io/Echo/");
    expect(pageHttpsUrl("http://localhost:5173/Echo/")).toBeNull();
  });

  it("puts Chinese first and does not claim the in-app mic will work", () => {
    const html = renderToStaticMarkup(
      <BrowserBanner
        ua="Mozilla/5.0 MicroMessenger/8.0.0"
        href="https://dsarangi7.github.io/Echo/"
        storage={memoryStorage()}
      />,
    );
    const zh = html.indexOf("微信里打开时，麦克风可能用不了");
    const en = html.indexOf("The mic may not work in the WeChat in-app browser");
    expect(zh).toBeGreaterThan(-1);
    expect(en).toBeGreaterThan(zh);
    expect(html).toContain("https://dsarangi7.github.io/Echo/");
    expect(html).toContain("Copy link");
    expect(html).toContain(FIRST_VISIT_TIP.zh);
    expect(html).toContain(FIRST_VISIT_TIP.en);
    expect(html).not.toMatch(/will work|就能用麦克风|点菜单/i);
    expect(inAppBannerCopy("wecom").zh.startsWith("企业微信")).toBe(true);
    expect(inAppBannerCopy("wecom").en).toContain("WeCom");

    const http = renderToStaticMarkup(
      <BrowserBanner ua="Mozilla/5.0 MicroMessenger/8.0.0" href="http://127.0.0.1:5173/" storage={memoryStorage()} />,
    );
    expect(http).not.toContain("Copy link");

    const storage = memoryStorage();
    saveBrowserTipSeen(storage);
    expect(loadBrowserTipSeen(storage)).toBe(true);
    const later = renderToStaticMarkup(
      <BrowserBanner ua="Mozilla/5.0 Chrome/120.0" href="https://dsarangi7.github.io/Echo/" storage={storage} />,
    );
    expect(later).toBe("");
  });
});

describe("recognition card chrome", () => {
  it("draws dashed chips instead of a red miss", () => {
    const html = renderToStaticMarkup(
      <TargetSentence lang="en" text="The printer is out." marks={[false, false, false, false]} unrecognized />,
    );
    expect(html).toContain('data-tone="unsure"');
    expect(html).toContain('class="unk"');
    expect(html).not.toContain('class="bad"');
    expect(html).not.toContain('class="ok"');
  });

  it("keeps the phrase index away from the clear-line stars", () => {
    const html = renderToStaticMarkup(
      <div>
        <p id="progress">1 / 100</p>
        <SessionStrip
          lang="en"
          session={{ clear: 3, partial: 2, unsure: 1, streak: 3, started: true }}
          onReset={() => undefined}
        />
      </div>,
    );
    const progress = html.slice(html.indexOf("<p id=\"progress\">"), html.indexOf("</p>") + 4);
    expect(progress).toBe('<p id="progress">1 / 100</p>');
    expect(progress).not.toContain("★");
    expect(html).toContain('id="session-stars"');
    expect(html).toContain("★×3");
    expect(html).toContain("Session: 3 clear · 2 partial · 1 mic unsure.");
    expect(html).toContain("本局：听清 3 · 部分 2 · 识别不准 1。");
    expect(html).toContain("Mic unsure");
    expect(html).toContain("识别不准");
    expect(html).not.toMatch(/\d+\s*%/);
  });
});
