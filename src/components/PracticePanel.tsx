import { useCallback, useEffect, useMemo, useState } from "react";
import { stepWithinSet } from "../practice/cards";
import { readingText } from "../practice/pinyin";
import { HEAR_PACE_LABEL, HEAR_PACES } from "../practice/pace";
import { emptySession } from "../practice/session";
import { micHeardLine } from "../practice/score";
import type { usePractice } from "../practice/usePractice";
import { FeedbackLines } from "./FeedbackLines";
import { FlashCard } from "./FlashCard";
import { PackPicker } from "./PackPicker";
import { SessionStrip } from "./SessionStrip";
import { StreakChrome } from "./StreakChrome";

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
    listening,
    jumpTo,
    hear,
    sayIt,
    pace,
    setPace,
    session,
    lineOutcome,
    resetSession,
  } = practice;
  const stepPack = practice.stepPack;
  const [picking, setPicking] = useState(false);

  const sets = useMemo(() => {
    const names: string[] = [];
    for (const row of pack) {
      if (!names.includes(row.set)) names.push(row.set);
    }
    return names.map((name) => {
      const first = pack.find((row) => row.set === name)!;
      const at = pack.findIndex((row) => row.set === name);
      let count = 0;
      for (const row of pack) if (row.set === name) count += 1;
      return { name, zhSet: first.zhSet, at, count };
    });
  }, [pack]);

  const found = pack.findIndex((row) => row.set === item.set);
  const setStart = found < 0 ? 0 : found;
  let setEnd = setStart + 1;
  while (setEnd < pack.length && pack[setEnd]?.set === item.set) setEnd += 1;
  const setCount = Math.max(1, setEnd - setStart);
  const setPos = Math.min(setCount, Math.max(1, index - setStart + 1));
  const primary = readingText(lang, item);
  const meaning = lang === "en" ? item.zh : item.en;
  const setTitle = lang === "zh" ? item.zhSet : item.set;
  const setSub = lang === "zh" ? item.set : item.zhSet;
  const quietStart =
    (kicker === "Hello" || kicker === "Practice" || kicker === "Note") &&
    outcome !== "recognition_fail" &&
    !lineOutcome &&
    !score;

  const move = useCallback(
    (delta: -1 | 1) => {
      if (typeof stepPack === "function") stepPack(delta);
      else jumpTo(stepWithinSet(pack, index, delta));
    },
    [index, jumpTo, pack, stepPack],
  );

  const choose = useCallback(
    (at: number, name: string) => {
      setPicking(false);
      if (name !== item.set) jumpTo(at);
    },
    [item.set, jumpTo],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && picking) {
        event.preventDefault();
        setPicking(false);
        return;
      }
      if (picking) return;
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      const tag = (event.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "BUTTON") return;
      if (event.key === "ArrowRight") {
        event.preventDefault();
        move(1);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        move(-1);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [move, picking]);

  return (
    <section className="card practice-card" aria-label="Practice">
      <div className="deck-bar">
        <button
          type="button"
          id="pack-toggle"
          className={picking ? "pack-toggle on" : "pack-toggle"}
          aria-expanded={picking}
          onClick={() => setPicking((open) => !open)}
        >
          <span className="pack-kicker">{picking ? "Card · 返回" : "Packs · 选一组"}</span>
          <b id="setlabel">{setTitle}</b>
          <small>
            {setSub} · {setPos} / {setCount}
          </small>
        </button>
        <p id="progress">
          {index + 1} / {pack.length}
        </p>
      </div>

      {picking ? (
        <PackPicker lang={lang} sets={sets} active={item.set} onSelect={choose} />
      ) : (
        <FlashCard
          index={index}
          setStart={setStart}
          setCount={setCount}
          setPos={setPos}
          setTitle={setTitle}
          setSub={setSub}
          nextIndex={stepWithinSet(pack, index, 1)}
          prevIndex={stepWithinSet(pack, index, -1)}
          lang={lang}
          primary={primary}
          meaning={meaning}
          marks={marks}
          unrecognized={outcome === "recognition_fail"}
          onJump={move}
        />
      )}

      {picking ? null : (
        <div className="thumb-dock">
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
            <button type="button" className="act primary" id="hear" onClick={hear}>
              <b>Hear it</b>
              <small>听一听</small>
            </button>
            <button type="button" className={listening ? "act primary live" : "act primary"} id="say" aria-pressed={listening} onClick={sayIt}>
              <b>{listening ? "Stop" : "Say it"}</b>
              <small>{listening ? "点此结束" : "说一说"}</small>
            </button>
          </div>
        </div>
      )}

      {picking ? null : (
        <>
          <details className="match-notes">
            <summary>Matching · 怎么比对</summary>
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
                对上了这个音节 matched
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
                按字比对，标在拼音上，不是口音分数。It checks characters and marks the pinyin, not an accent score.
              </p>
            )}
          </details>

          {quietStart ? null : (
          <div className={outcome === "recognition_fail" ? "result recognition" : "result"} id="result" aria-live="polite">
            <p className={outcome === "recognition_fail" ? "kicker mic-heard" : "kicker"} id="kicker">
              {kicker}
            </p>
            <p id="heard" className={outcome === "recognition_fail" ? "fail-headline" : undefined}>
              {heard}
            </p>
            {lineOutcome ? <FeedbackLines lang={lang} kind={lineOutcome} session={session ?? emptySession()} /> : null}
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
          )}
          <p className="keys">左右滑动，或点两边的箭头。 Swipe, or ← →. arrow keys change the sentence</p>
        </>
      )}
      <SessionStrip lang={lang} session={session ?? emptySession()} onReset={resetSession ?? (() => undefined)} />
      <StreakChrome lang={lang} session={session ?? emptySession()} />
    </section>
  );
}
