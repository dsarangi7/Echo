import type { CatMode } from "../practice/types";
import { CatFigure, type CatMood } from "./CatFigure";

type Props = {
  mode: CatMode;
  mouth: number;
  onIntroduce: () => void;
  label?: string;
  /** Overrides the mood that `mode` implies (happy after a clear line, and so on). */
  mood?: CatMood;
};

const MOOD_LABEL: Record<CatMood, string> = {
  idle: "待命 · idle",
  listen: "在听 · listening",
  talk: "在说 · speaking",
  think: "在想 · thinking",
  happy: "真棒 · great",
  oops: "差一点 · almost",
  sleepy: "打盹 · napping",
};

export function moodFromMode(mode: CatMode): CatMood {
  return mode;
}

export function CatMascot({ mode, mouth, onIntroduce, label, mood }: Props) {
  const shown = mood ?? moodFromMode(mode);
  return (
    <section className={`card cat-card ${mode} mood-${shown}`} id="cat-card">
      <div className="stage-light" aria-hidden="true" />
      <button
        type="button"
        className="cat-hit"
        id="cat-intro"
        onClick={onIntroduce}
        aria-label={label ?? "Play Echo's introduction. 播放课猫的自我介绍。"}
      >
        <CatFigure className="cat-svg" mood={shown} level={mouth} />
        <div className="nameplate">
          <strong>课猫 Echo</strong>
          <span id="mode">{MOOD_LABEL[shown]}</span>
        </div>
      </button>
    </section>
  );
}
