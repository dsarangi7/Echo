import { useEffect, useState } from "react";
import { BrowserBanner } from "./components/BrowserBanner";
import { CatMascot } from "./components/CatMascot";
import { ModelInterstitial } from "./components/ModelInterstitial";
import { PracticePanel } from "./components/PracticePanel";
import { SettingsSheet } from "./components/SettingsSheet";
import { syncNativeReminders } from "./native/syncReminders";
import { startReminderRuntime } from "./practice/reminder-runtime";
import { usePractice } from "./practice/usePractice";
import { introLine, introReading } from "./speech/intro";

export function App() {
  const practice = usePractice();
  const { lang, setLanguage } = practice;
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => startReminderRuntime(), []);

  useEffect(() => {
    void syncNativeReminders();
  }, []);

  const greeting = introReading(lang);
  const greetingAside = introLine(lang === "en" ? "zh" : "en");

  return (
    <div className="wrap">
      <header className="hello">
        <CatMascot mode={practice.catMode} mouth={practice.mouth} onIntroduce={practice.introduce} />
        <div className="hello-copy">
          <h1>课猫 Echo</h1>
          <p className="meow" id="greeting">
            <b className={lang === "zh" ? "pinyin" : undefined} lang={lang === "zh" ? "zh-Latn" : "en"}>
              {greeting}
            </b>
            <small lang={lang === "en" ? "zh-CN" : "en"}>{greetingAside}</small>
          </p>
        </div>
        <div className="top-actions">
          <div className="lang-switch" role="group" aria-label="Language to practice">
            <button
              type="button"
              id="lang-en"
              className={lang === "en" ? "on" : undefined}
              aria-pressed={lang === "en"}
              onClick={() => setLanguage("en")}
            >
              <span>English</span>
              <small>练英语</small>
            </button>
            <button
              type="button"
              id="lang-zh"
              className={lang === "zh" ? "on" : undefined}
              aria-pressed={lang === "zh"}
              onClick={() => setLanguage("zh")}
            >
              <span>中文</span>
              <small>练中文</small>
            </button>
          </div>
          <button
            type="button"
            className="settings-open"
            id="open-settings"
            aria-label="Settings. 设置"
            aria-haspopup="dialog"
            aria-expanded={settingsOpen}
            aria-controls="settings-sheet"
            onClick={() => setSettingsOpen(true)}
          >
            <svg className="settings-gear" width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z"
              />
              <path
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinejoin="round"
                d="M19.4 13.1a7.7 7.7 0 0 0 .1-2.2l1.7-1.3-1.8-3.1-2 .6a7.6 7.6 0 0 0-1.9-1.1L15.1 4h-3.6l-.4 2a7.6 7.6 0 0 0-1.9 1.1l-2-.6-1.8 3.1 1.7 1.3a7.7 7.7 0 0 0 0 2.2l-1.7 1.3 1.8 3.1 2-.6a7.6 7.6 0 0 0 1.9 1.1l.4 2h3.6l.4-2a7.6 7.6 0 0 0 1.9-1.1l2 .6 1.8-3.1-1.7-1.3Z"
              />
            </svg>
          </button>
        </div>
      </header>

      <div className="stage">
        <PracticePanel {...practice} />
      </div>
      <section className="notices" aria-label="Notices. 提示">
        {practice.kicker === "Note" && practice.heard ? (
          <p className="notice-line" id="notice-heard" role="status">
            {practice.heard}
          </p>
        ) : null}
        <BrowserBanner />
        <ModelInterstitial onHearFirst={practice.hear} />
        <p className="status-note" id="model-note" aria-live="polite">
          {practice.modelNote}
        </p>
        <p id="err">{practice.error}</p>
      </section>
      <SettingsSheet open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
