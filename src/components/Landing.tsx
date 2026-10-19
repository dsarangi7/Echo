import { useEffect } from "react";
import type { CatMode, Lang } from "../practice/types";
import { CatMascot } from "./CatMascot";

type Props = {
  lang: Lang;
  catMode: CatMode;
  mouth: number;
  greeting: string;
  greetingAside: string;
  onIntroduce: () => void;
  onStart: () => void;
};

export function Landing({ lang, catMode, mouth, greeting, greetingAside, onIntroduce, onStart }: Props) {
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      document.getElementById("landing-start")?.focus();
    });
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div className="landing" id="landing">
      <div className="landing-card">
        <CatMascot
          mode={catMode}
          mouth={mouth}
          onIntroduce={onIntroduce}
          label="Hear Echo and start. 听课猫介绍并开始。"
        />
        <div className="landing-copy">
          <h1>课猫 Echo</h1>
          <p className="meow" id="greeting">
            <b className={lang === "zh" ? "pinyin" : undefined} lang={lang === "zh" ? "zh-Latn" : "en"}>
              {greeting}
            </b>
            <small lang={lang === "en" ? "zh-CN" : "en"}>{greetingAside}</small>
          </p>
        </div>
        <button type="button" className="act primary landing-start" id="landing-start" onClick={onStart}>
          <b>Start</b>
          <small>开始练习</small>
        </button>
      </div>
    </div>
  );
}
