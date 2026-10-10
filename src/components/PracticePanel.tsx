import { useMemo } from "react";
import { HEAR_PACE_LABEL, HEAR_PACES } from "../practice/pace";
import { emptySession } from "../practice/session";
import { micHeardLine } from "../practice/score";
import type { usePractice } from "../practice/usePractice";
import { FeedbackLines } from "./FeedbackLines";
import { SessionStrip } from "./SessionStrip";
import { TargetSentence } from "./TargetSentence";

type Practice = ReturnType<typeof usePractice>;

export function PracticePanel(practice: Practice) {
  const {
    lang,
    index,
    item,
    pack,
    marks,
    outcome,
    heardPreview,
    kicker,
    heard,
    score,
    modelNote,
    listening,
    error,
    jump,
    jumpTo,
    hear,
    sayIt,
    pace,
    setPace,
    session,
    lineOutcome,
    resetSession,
  } = practice;

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
  const setStart = pack.findIndex((row) => row.set === item.set);
  let setEnd = setStart + 1;
  while (setEnd < pack.length && pack[setEnd].set === item.set) setEnd += 1;
  const setPos = index - setStart + 1;
  const setCount = setEnd - setStart;

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
            {setSub} · {setPos} / {setCount}
          </span>
        </p>
        <p id="progress">
          {index + 1} / {pack.length}
        </p>
      </div>

      <SessionStrip lang={lang} session={session ?? emptySession()} onReset={resetSession ?? (() => undefined)} />

      <TargetSentence lang={lang} text={primary} marks={marks} unrecognized={outcome === "recognition_fail"} />
      <p className="meaning" id="meaning" lang={lang === "en" ? "zh-CN" : "en-US"}>
        {meaning}
      </p>

      <div className="pace">
        <p className="pace-label" id="pace-label">
          <b>Hear it pace</b>
          <span>听的语速</span>
        </p>
        <div className="pace-switch" role="group" aria-labelledby="pace-label">
          {HEAR_PACES.map((id) => (
            <button
              key={id}
              type="button"
              id={`pace-${id}`}
              className={pace === id ? "on" : undefined}
              aria-pressed={pace === id}
              onClick={() => setPace(id)}
            >
              <span>{HEAR_PACE_LABEL[id].en}</span>
              <small>{HEAR_PACE_LABEL[id].zh}</small>
            </button>
          ))}
        </div>
      </div>

      <div className="actions">
        <button type="button" className="act ghost" id="prev" onClick={() => jump(-1)}>
          <b>Previous</b>
          <small>上一句</small>
        </button>
        <button type="button" className="act primary" id="hear" onClick={hear}>
          <b>Hear it</b>
          <small>听一听</small>
        </button>
        <button type="button" className={listening ? "act primary live" : "act primary"} id="say" aria-pressed={listening} onClick={sayIt}>
          <b>{listening ? "Stop" : "Say it"}</b>
          <small>{listening ? "点此结束" : "说一说"}</small>
        </button>
        <button type="button" className="act ghost" id="next" onClick={() => jump(1)}>
          <b>Next</b>
          <small>下一句</small>
        </button>
      </div>

      <p className="status-note" id="model-note" aria-live="polite">
        {modelNote}
      </p>

      {outcome === "recognition_fail" ? (
        <p className="legend" id="legend-match">
          <span className="sw unk" />
          {lang === "zh"
            ? "没标成错。识别可能偏了，不是你说错。 Not marked wrong — recognition may be off."
            : "Not marked wrong — recognition may be off. 没标成错，可能是识别偏了。"}
        </p>
      ) : lang === "en" ? (
        <p className="legend" id="legend-match">
          <span className="sw ok" />
          matched word
          <span className="sw bad" />
          missing word · 对上了 / 没对上
        </p>
      ) : (
        <p className="legend" id="legend-match">
          <span className="sw ok" />
          对上了这个字 matched
          <span className="sw bad" />
          没对上 missing
        </p>
      )}
      {lang === "en" ? (
        <p className="legend" id="legend-score">
          It checks words, not an accent score. 按词比对，不是口音分数。
        </p>
      ) : (
        <p className="legend" id="legend-score">
          按字比对，不是口音分数。It checks characters, not an accent score.
        </p>
      )}

      <div className={outcome === "recognition_fail" ? "result recognition" : "result"} id="result" aria-live="polite">
        <p className={outcome === "recognition_fail" ? "kicker mic-heard" : "kicker"} id="kicker">
          {kicker}
        </p>
        <p id="heard" className={outcome === "recognition_fail" ? "fail-headline" : undefined}>
          {heard}
        </p>
        {lineOutcome ? <FeedbackLines lang={lang} kind={lineOutcome} session={session} /> : null}
        {outcome === "recognition_fail" ? (
          <>
            <p id="heard-preview" className="heard-muted">
              {micHeardLine(lang, heardPreview)}
            </p>
            <div className="fail-actions">
              <button type="button" className="act primary" id="retry-hear" onClick={hear}>
                <b>Hear it</b>
                <small>听一听</small>
              </button>
              <button type="button" className="act ghost" id="retry-say" onClick={sayIt}>
                <b>Try again</b>
                <small>再说一次</small>
              </button>
            </div>
          </>
        ) : (
          <p id="score">{score}</p>
        )}
      </div>
      <p className="keys">← → 换句子 · arrow keys change the sentence</p>
      <p id="err">{error}</p>
    </section>
  );
}
