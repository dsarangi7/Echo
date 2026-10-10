import { useEffect } from "react";
import { BrowserBanner } from "./components/BrowserBanner";
import { CatMascot } from "./components/CatMascot";
import { ModelInterstitial } from "./components/ModelInterstitial";
import { PracticePanel } from "./components/PracticePanel";
import { startReminderRuntime } from "./practice/reminder-runtime";
import { usePractice } from "./practice/usePractice";

export function App() {
  const practice = usePractice();
  const { lang, setLanguage, jump } = practice;

  useEffect(() => startReminderRuntime(), []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      const tag = (event.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "BUTTON") return;
      if (event.key === "ArrowRight") {
        event.preventDefault();
        jump(1);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        jump(-1);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [jump]);

  const tag =
    lang === "en"
      ? "课猫 Echo · English / Chinese practice · Practice English now"
      : "课猫 Echo · English / Chinese practice · 现在练中文";

  return (
    <div className="wrap">
      <BrowserBanner />
      <header className="top">
        <div>
          <h1>课猫 Echo</h1>
          <p className="tag" id="tag">
            {tag}
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

      <ModelInterstitial onHearFirst={practice.hear} />

      <div className="stage">
        <CatMascot mode={practice.catMode} mouth={practice.mouth} onIntroduce={practice.introduce} />
        <PracticePanel {...practice} />
      </div>
    </div>
  );
}
