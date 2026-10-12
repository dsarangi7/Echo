import { cardTone } from "../practice/cards";
import type { Lang } from "../practice/types";

export type PackChoice = {
  name: string;
  zhSet: string;
  at: number;
  count: number;
};

type Props = {
  lang: Lang;
  sets: PackChoice[];
  active: string;
  onSelect: (at: number, name: string) => void;
};

export function PackPicker({ lang, sets, active, onSelect }: Props) {
  return (
    <div className="pack-step" id="sets">
      <h2 className="pack-step-title">
        {lang === "zh" ? "选一组" : "Choose a pack"}
        <small>{lang === "zh" ? "Choose a pack" : "选一组句子"}</small>
      </h2>
      <div className="pack-grid">
        {sets.map((set, i) => {
          const tone = cardTone(i);
          const on = set.name === active;
          const title = lang === "zh" ? set.zhSet : set.name;
          const sub = lang === "zh" ? set.name : set.zhSet;
          return (
            <button
              key={set.name}
              type="button"
              className={on ? "pack-tile on" : "pack-tile"}
              aria-pressed={on}
              style={{ background: tone.bg, color: tone.ink }}
              onClick={() => onSelect(set.at, set.name)}
            >
              <b>{title}</b>
              <small style={{ color: tone.soft }}>{sub}</small>
              <span className="pack-count" style={{ color: tone.soft }}>
                {set.count} 句
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
