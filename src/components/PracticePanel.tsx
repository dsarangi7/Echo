import { useMemo } from "react";
import type { usePractice } from "../practice/usePractice";
import { TargetSentence } from "./TargetSentence";

type Practice = ReturnType<typeof usePractice>;

export function PracticePanel(practice: Practice) {
  const { lang, index, item, pack, marks, kicker, heard, score, showChromeNote, error, jump, jumpTo, hear, sayIt } = practice;

  const sets = useMemo(() => {
    const names: string[] = [];
    for (const row of pack) {
      if (!names.includes(row.set)) names.push(row.set);
    }
    return names.map((name) => {
      const first = pack.find((row) => row.set === name)!;
      return { name, zhSet: first.zhSet, at: pack.findIndex((row) => row.set === name) };
    });
  }, [pack]);

  const primary = lang === "en" ? item.en : item.zh;
  const meaning = lang === "en" ? item.zh : item.en;
  const setTitle = lang === "zh" ? item.zhSet : item.set;
  const setSub = lang === "zh" ? item.set : item.zhSet;

  return (
    <section className="card practice-card">
      <div className="sets" id="sets">
        {sets.map((set) => {
          const on = set.name === item.set;
          return (
            <button
              key={set.name}
              type="button"
              className={on ? "set on" : "set"}
              aria-pressed={on}
              onClick={() => jumpTo(set.at)}
            >
              <b>{lang === "zh" ? set.zhSet : set.name}</b>
              <small>{lang === "zh" ? set.name : set.zhSet}</small>
            </button>
          );
        })}
      </div>

      <div className="topline">
        <p id="setlabel">
          <b>{setTitle}</b>
          <span>
            {setSub} · {((index % 10) + 1)} / 10
          </span>
        </p>
        <p id="progress">
          {index + 1} / {pack.length}
        </p>
      </div>

      <TargetSentence lang={lang} text={primary} marks={marks} />
      <p className="meaning" id="meaning" lang={lang === "en" ? "zh-CN" : "en-US"}>
        {meaning}
      </p>

      <div className="actions">
        <button type="button" className="act ghost" id="prev" onClick={() => jump(-1)}>
          <b>Previous</b>
          <small>上一句</small>
        </button>
        <button type="button" className="act primary" id="hear" onClick={hear}>
          <b>Hear it</b>
          <small>听一听</small>
        </button>
        <button type="button" className="act primary" id="say" onClick={sayIt}>
          <b>Say it</b>
          <small>说一说</small>
        </button>
        <button type="button" className="act ghost" id="next" onClick={() => jump(1)}>
          <b>Next</b>
          <small>下一句</small>
        </button>
      </div>

      <p className="chrome-note" id="chrome-note" hidden={!showChromeNote}>
        说一说需要 Chrome。Say it needs Chrome.
      </p>

      {lang === "en" ? (
        <>
          <p className="legend" id="legend-match">
            <span className="sw ok" />
            matched word
            <span className="sw bad" />
            missing word · 对上了 / 没对上
          </p>
          <p className="legend" id="legend-score">
            It checks words, not an accent score. 按词比对，不是口音分数。
          </p>
        </>
      ) : (
        <>
          <p className="legend" id="legend-match">
            <span className="sw ok" />
            对上了这个字 matched
            <span className="sw bad" />
            没对上 missing
          </p>
          <p className="legend" id="legend-score">
            按字比对，不是口音分数。It checks characters, not an accent score.
          </p>
        </>
      )}

      <div className="result" id="result" aria-live="polite">
        <p className="kicker" id="kicker">
          {kicker}
        </p>
        <p id="heard">{heard}</p>
        <p id="score">{score}</p>
      </div>
      <p className="keys">← → 换句子 · arrow keys change the sentence</p>
      <p id="err">{error}</p>
    </section>
  );
}
