import { useState } from "react";
import {
  FIRST_VISIT_TIP,
  detectInAppBrowser,
  inAppBannerCopy,
  loadBrowserTipSeen,
  pageHttpsUrl,
  saveBrowserTipSeen,
} from "../ui/inAppBrowser";

type Props = {
  ua?: string;
  href?: string;
  storage?: Storage | null;
};

function safeLocal(): Storage | null {
  try {
    if (typeof localStorage === "undefined") return null;
    return localStorage;
  } catch {
    return null;
  }
}

export function BrowserBanner({ ua, href, storage }: Props) {
  const agent = ua ?? (typeof navigator === "undefined" ? "" : navigator.userAgent);
  const page = href ?? (typeof location === "undefined" ? "" : location.href);
  const store = storage === undefined ? safeLocal() : storage;
  const inApp = detectInAppBrowser(agent);
  const httpsUrl = pageHttpsUrl(page);
  const [tipSeen, setTipSeen] = useState(() => loadBrowserTipSeen(store));
  const [copied, setCopied] = useState(false);

  async function copyUrl() {
    if (!httpsUrl) return;
    try {
      await navigator.clipboard.writeText(httpsUrl);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  const banner = inApp ? inAppBannerCopy(inApp) : null;

  if (!banner && tipSeen) return null;

  return (
    <div className="browser-stack">
      {banner ? (
        <aside className="browser-banner" id="wechat-banner" role="note">
          <p className="zh">{banner.zh}</p>
          <p className="en">{banner.en}</p>
          {httpsUrl ? (
            <div className="browser-copy">
              <p className="url" id="wechat-url">
                {httpsUrl}
              </p>
              <button type="button" className="act ghost" id="copy-https" onClick={() => void copyUrl()}>
                <b>{copied ? "Copied" : "Copy link"}</b>
                <small>{copied ? "已复制" : "复制链接"}</small>
              </button>
            </div>
          ) : null}
        </aside>
      ) : null}
      {tipSeen ? null : (
        <aside className="browser-tip" id="browser-tip" role="note">
          <p className="zh">{FIRST_VISIT_TIP.zh}</p>
          <p className="en">{FIRST_VISIT_TIP.en}</p>
          <button
            type="button"
            className="act ghost"
            id="browser-tip-dismiss"
            onClick={() => {
              saveBrowserTipSeen(store);
              setTipSeen(true);
            }}
          >
            <b>Got it</b>
            <small>知道了</small>
          </button>
        </aside>
      )}
    </div>
  );
}
