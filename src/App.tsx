import { useEffect } from "react";
import { BrowserBanner } from "./components/BrowserBanner";
import { CatMascot } from "./components/CatMascot";
import { ModelInterstitial } from "./components/ModelInterstitial";
import { PracticePanel } from "./components/PracticePanel";
import { ReminderCard } from "./components/ReminderCard";
import { syncNativeReminders } from "./native/syncReminders";
import { startReminderRuntime } from "./practice/reminder-runtime";
import { usePractice } from "./practice/usePractice";
import { introLine } from "./speech/intro";

export function App() {
  const practice = usePractice();
  const { lang, setLanguage } = practice;

  useEffect(() => startReminderRuntime(), []);

  useEffect(() => {
    void syncNativeReminders();
  }, []);

  const greeting = introLine(lang);
  const greetingAside = introLine(lang === "en" ? "zh" : "en");

  return (
    <div className="wrap">
      <header className="hello">
        <CatMascot mode={practice.catMode} mouth={practice.mouth} onIntroduce={practice.introduce} />
        <div className="hello-copy">
          <h1>课猫 Echo</h1>
          <p className="meow" id="greeting">
            <b>{greeting}</b>
            <small lang={lang === "en" ? "zh-CN" : "en"}>{greetingAside}</small>
          </p>
        </div>
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
      </header>

      <div className="stage">
        <PracticePanel {...practice} />
      </div>
      <ReminderCard />
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
    </div>
  );
}
