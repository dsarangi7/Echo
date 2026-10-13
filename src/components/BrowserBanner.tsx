import { useState } from "react";
import { detectInAppBrowser, inAppBannerCopy, pageHttpsUrl } from "../ui/inAppBrowser";

type Props = {
  ua?: string;
  href?: string;
};

export function BrowserBanner({ ua, href }: Props) {
  const agent = ua ?? (typeof navigator === "undefined" ? "" : navigator.userAgent);
  const page = href ?? (typeof location === "undefined" ? "" : location.href);
  const inApp = detectInAppBrowser(agent);
  const httpsUrl = pageHttpsUrl(page);
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

  if (!inApp) return null;
  const banner = inAppBannerCopy(inApp);

  return (
    <div className="browser-stack">
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
    </div>
  );
}
