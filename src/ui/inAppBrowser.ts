export type InAppBrowser = "wechat" | "wecom";

/** WeCom's UA also contains MicroMessenger, so wxwork wins. */
export function detectInAppBrowser(ua: string): InAppBrowser | null {
  const text = ua || "";
  if (/wxwork/i.test(text) || /WeCom/i.test(text)) return "wecom";
  if (/MicroMessenger/i.test(text)) return "wechat";
  return null;
}

export function inAppBannerCopy(kind: InAppBrowser): { zh: string; en: string } {
  if (kind === "wecom") {
    return {
      zh: "企业微信里打开时，麦克风可能用不了。请用 Safari 或 Chrome 打开。",
      en: "The mic may not work in the WeCom in-app browser. Open this page in Safari or Chrome.",
    };
  }
  return {
    zh: "微信里打开时，麦克风可能用不了。请用 Safari 或 Chrome 打开。",
    en: "The mic may not work in the WeChat in-app browser. Open this page in Safari or Chrome.",
  };
}

/** Tap-to-copy only for a real https page. http cannot be offered as the share link. */
export function pageHttpsUrl(href: string): string | null {
  try {
    const url = new URL(href);
    if (url.protocol !== "https:") return null;
    return url.href;
  } catch {
    return null;
  }
}
