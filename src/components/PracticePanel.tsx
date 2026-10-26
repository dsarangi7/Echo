import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { stepWithinSet } from "../practice/cards";
import { readingText } from "../practice/pinyin";
import { HEAR_PACE_LABEL, HEAR_PACES } from "../practice/pace";
import { emptySession } from "../practice/session";
import { micHeardLine } from "../practice/score";
import { practiceLocalStorage } from "../practice/streak";
import { usePracticeStreak } from "../practice/usePracticeSignals";
import { lessonsForDeck } from "../practice/families";
import { useWordDeck } from "../practice/useWordDeck";
import type { usePractice } from "../practice/usePractice";
import { DAILY_WORD_COUNT, WORD_PACK_NAME, WORD_PACK_ZH, meaningChoices, officeWords, practicePacks, spokenOf, wordDeckById } from "../practice/words";
import { MATCH_TIP_MS, readMatchTipSeen, writeMatchTipSeen } from "../ui/matchTip";
import { DayTask } from "./DayTask";
import { FeedbackLines } from "./FeedbackLines";
import { FlashCard } from "./FlashCard";
import { PackPicker } from "./PackPicker";
import { SessionStrip } from "./SessionStrip";
import { StreakChrome } from "./StreakChrome";
import { FamilyCard } from "./FamilyCard";
import { WordCard } from "./WordCard";

type Practice = ReturnType<typeof usePractice>;

export function PracticePanel(practice: Practice & { active?: boolean; wordDeck?: boolean; deckId?: string | null }) {
  const {
    active = true,
    wordDeck = false,
    deckId = null,
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
  const setPracticeLine = practice.setPracticeLine;
  const setOwnStreak = practice.setOwnStreak;
  const gradedText = practice.gradedText ?? "";
  const gradedPlain = practice.gradedPlain === true;
  const words = useWordDeck(lang, wordDeck);
  const chosenDeck = wordDeck ? wordDeckById(deckId) : null;
  const familyLesson = chosenDeck?.kind === "family" ? (lessonsForDeck(chosenDeck.id)[0] ?? null) : null;
  const [picking, setPicking] = useState(false);
  const day = usePracticeStreak();
  const [tipSeen, setTipSeen] = useState(() => readMatchTipSeen(practiceLocalStorage()));
  const tipIndex = useRef(index);

  const dismissTip = useCallback(() => {
    setTipSeen(true);
    writeMatchTipSeen(practiceLocalStorage());
  }, []);

  useEffect(() => {
    if (!active || tipSeen) return;
    const id = window.setTimeout(dismissTip, MATCH_TIP_MS);
    return () => window.clearTimeout(id);
  }, [active, dismissTip, tipSeen]);

  useEffect(() => {
    if (tipIndex.current === index) return;
    tipIndex.current = index;
    dismissTip();
  }, [dismissTip, index]);

  const wordMode = words.wordMode && !familyLesson;
  const showPacks = picking && !wordDeck;
  const activeWord = words.word;
  const finishWord = words.finish;

  useEffect(() => {
    setOwnStreak?.(wordMode);
    return () => setOwnStreak?.(false);
  }, [setOwnStreak, wordMode]);

  useEffect(() => {
    if (!wordMode || !activeWord) {
      setPracticeLine?.(null);
      return;
    }
    setPracticeLine?.({ text: spokenOf(activeWord), speak: "plain" });
  }, [activeWord, setPracticeLine, wordMode]);

  useEffect(() => {
    if (!wordMode || !activeWord || lineOutcome !== "clear" || !gradedPlain) return;
    if (gradedText !== spokenOf(activeWord)) return;
    finishWord(activeWord.id, false);
  }, [activeWord, finishWord, gradedPlain, gradedText, lineOutcome, wordMode]);

  const sets = useMemo(() => practicePacks(pack), [pack]);

  const found = pack.findIndex((row) => row.set === item.set);
  const setStart = found < 0 ? 0 : found;
  let setEnd = setStart + 1;
  while (setEnd < pack.length && pack[setEnd]?.set === item.set) setEnd += 1;
  const setCount = Math.max(1, setEnd - setStart);
  const setPos = Math.min(setCount, Math.max(1, index - setStart + 1));
  const primary = readingText(lang, item);
  const meaning = lang === "en" ? item.zh : item.en;
  const setTitle = wordDeck ? (chosenDeck?.name ?? WORD_PACK_NAME) : lang === "zh" ? item.zhSet : item.set;
  const setSub = wordDeck ? (chosenDeck?.zh ?? WORD_PACK_ZH) : lang === "zh" ? item.set : item.zhSet;
  const quietStart =
    (kicker === "Hello" || kicker === "Practice" || kicker === "Note") &&
    outcome !== "recognition_fail" &&
    !lineOutcome &&
    !score;

  const move = useCallback(
    (delta: -1 | 1) => {
      if (familyLesson) return;
      if (wordMode) {
        words.move(delta);
        return;
      }
      if (typeof stepPack === "function") stepPack(delta);
      else jumpTo(stepWithinSet(pack, index, delta));
    },
    [familyLesson, index, jumpTo, pack, stepPack, wordMode, words],
  );

  const choose = useCallback(
    (at: number, name: string) => {
      setPicking(false);
      if (name !== item.set) jumpTo(at);
    },
    [item.set, jumpTo],
  );

  useEffect(() => {
    if (wordDeck) setPicking(false);
  }, [wordDeck]);

  useEffect(() => {
    if (!active) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && showPacks) {
        event.preventDefault();
        setPicking(false);
        return;
      }
      if (showPacks) return;
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
  }, [active, move, showPacks]);

  return (
    <section className="card practice-card" aria-label="Practice">
      <div className="deck-bar">
        {wordDeck ? (
          <div className={familyLesson ? "deck-current is-family" : "deck-current"}>
            <span className="pack-kicker">Word deck · 单词卡</span>
            <b id="setlabel">{setTitle}</b>
            <small>
              {familyLesson ? setSub : `${setSub} · ${words.cursor + 1} / ${Math.max(1, words.words.length)}`}
            </small>
          </div>
        ) : (
          <button
            type="button"
            id="pack-toggle"
            className={showPacks ? "pack-toggle on" : "pack-toggle"}
            aria-expanded={showPacks}
            onClick={() => setPicking((open) => !open)}
          >
            <span className="pack-kicker">{showPacks ? "Card · 返回" : "Packs · 选一组"}</span>
            <b id="setlabel">{setTitle}</b>
            <small>
              {setSub} · {setPos} / {setCount}
            </small>
          </button>
        )}
        {familyLesson ? null : (
          <p
            id="progress"
            aria-label={wordMode ? `${words.doneCount} of ${DAILY_WORD_COUNT} words done today. 今天完成 ${words.doneCount} 个。` : undefined}
          >
            {wordMode ? `${words.doneCount}/${DAILY_WORD_COUNT}` : `${index + 1} / ${pack.length}`}
          </p>
        )}
      </div>

      {showPacks ? (
        <PackPicker lang={lang} sets={sets} active={item.set} onSelect={choose} />
      ) : familyLesson ? (
        <FamilyCard lesson={familyLesson} />
      ) : wordMode && activeWord ? (
        <>
          <p
            id="word-day"
            className={words.doneCount >= DAILY_WORD_COUNT ? "word-day is-complete" : "word-day"}
            role="status"
          >
            <b>
              {words.doneCount}/{DAILY_WORD_COUNT}
            </b>
            <span>{words.doneCount >= DAILY_WORD_COUNT ? "Today's words are done" : "Today's words"}</span>
            <small>{words.doneCount >= DAILY_WORD_COUNT ? "今天的词完成了" : "今天的词"}</small>
            <span className="word-pips" aria-hidden="true">
              {words.words.map((entry) => (
                <i key={entry.id} className={words.doneIds.includes(entry.id) ? "on" : undefined} />
              ))}
            </span>
          </p>
          <WordCard
            index={words.cursor}
            count={words.words.length}
            word={activeWord}
            flipped={words.flipped}
            done={words.doneIds.includes(activeWord.id)}
            choices={meaningChoices(officeWords, activeWord, words.todayKey ?? "")}
            onFlip={() => words.setFlipped((open) => !open)}
            onPick={(id) => {
              words.finish(id, true);
              words.setFlipped(true);
            }}
            onJump={move}
          />
        </>
      ) : wordDeck ? (
        <p className="status-note" role="status">
          No words in this deck yet. 这组还没有词。
        </p>
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

      {showPacks || familyLesson ? null : (
        <div className="thumb-dock">
          {quietStart ? null : (
            <div className={outcome === "recognition_fail" ? "result recognition" : "result"} id="result" aria-live="polite">
              <p className={outcome === "recognition_fail" ? "kicker mic-heard" : "kicker"} id="kicker">
                {kicker}
              </p>
              <p id="heard" className={outcome === "recognition_fail" ? "fail-headline" : undefined}>
                {heard}
              </p>
              {lineOutcome ? (
                <FeedbackLines
                  lang={lang}
                  kind={lineOutcome}
                  session={session ?? emptySession()}
                  day={{ clears: day.todayClears, goal: day.goal, complete: day.dayComplete }}
                />
              ) : null}
              {outcome === "recognition_fail" ? (
                <>
                  <p id="heard-preview" className="heard-muted">
                    {micHeardLine(lang, heardPreview)}
                  </p>
                  <div className="fail-actions">
                    <button type="button" className="act primary" id="retry-hear" onClick={() => { dismissTip(); hear(); }}>
                      <b>Hear it</b>
                      <small>听一听</small>
                    </button>
                    <button type="button" className="act ghost" id="retry-say" onClick={() => { dismissTip(); sayIt(); }}>
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
          <DayTask view={day} />
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
            <button type="button" className="act primary" id="hear" onClick={() => { dismissTip(); hear(); }}>
              <b>Hear it</b>
              <small>听一听</small>
            </button>
            <button type="button" className={listening ? "act primary live" : "act primary"} id="say" aria-pressed={listening} onClick={() => { dismissTip(); sayIt(); }}>
              <b>{listening ? "Stop" : "Say it"}</b>
              <small>{listening ? "点此结束" : "说一说"}</small>
            </button>
          </div>
        </div>
      )}

      {!showPacks && !wordDeck && outcome !== "recognition_fail" && !tipSeen ? (
        <div className="match-tip" id="match-tip" role="status">
          <p className="match-tip-kicker">Matching · 怎么比对</p>
          {lang === "en" ? (
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
        </div>
      ) : null}
      {!showPacks && !familyLesson && outcome === "recognition_fail" ? (
        <p className="match-tip" id="legend-match">
          <span className="sw unk" />
          {lang === "zh"
            ? "没标成错。识别可能偏了，不是你说错。 Not marked wrong — recognition may be off."
            : "Not marked wrong — recognition may be off. 没标成错，可能是识别偏了。"}
        </p>
      ) : null}
      {familyLesson ? null : (
        <>
          <SessionStrip lang={lang} session={session ?? emptySession()} onReset={resetSession ?? (() => undefined)} />
          <StreakChrome lang={lang} session={session ?? emptySession()} />
        </>
      )}
    </section>
  );
}
