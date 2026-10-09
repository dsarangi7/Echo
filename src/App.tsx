import { useEffect } from "react";
import { CatMascot } from "./components/CatMascot";
import { PracticePanel } from "./components/PracticePanel";
import { usePractice } from "./practice/usePractice";

export function App() {
  const practice = usePractice();
  const { lang, setLanguage, jump } = practice;

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

      <div className="stage">
        <CatMascot mode={practice.catMode} mouth={practice.mouth} />
        <PracticePanel {...practice} />
      </div>

      <footer className="note">
        这是课堂演示。猫是原创的，不是 Talking Tom。听写对的是词或字，不是口音分数。说一说在本机运行，可以加到主屏幕。 / Class demo. Original cat, not Talking Tom. It checks words or characters, not an accent score. Say it runs on this device. You can install it.
      </footer>
    </div>
  );
}
