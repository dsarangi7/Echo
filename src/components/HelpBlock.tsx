import { useState } from "react";
import { detectInAppBrowser, inAppBannerCopy, pageHttpsUrl } from "../ui/inAppBrowser";

type Props = {
  ua?: string;
  href?: string;
};

/** Mic guidance and a feedback address. Lives in Settings, not on the practice page. */
export function HelpBlock({ ua, href }: Props) {
  const agent = ua ?? (typeof navigator === "undefined" ? "" : navigator.userAgent);
  const page = href ?? (typeof location === "undefined" ? "" : location.href);
  const inApp = detectInAppBrowser(agent);
  const httpsUrl = pageHttpsUrl(page);
  const banner = inAppBannerCopy(inApp ?? "wechat");
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

  return (
    <section className="help-block" id="help" aria-labelledby="help-title">
      <p className="theme-label" id="help-title">
        <b>Help</b>
        <small>帮助</small>
      </p>
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
      <p className="help-mail" id="help-feedback">
        <b>Feedback</b>
        <small>建议</small>
        <a id="help-email" href="mailto:dsarangi7@gmail.com">
          dsarangi7@gmail.com
        </a>
      </p>
    </section>
  );
}
