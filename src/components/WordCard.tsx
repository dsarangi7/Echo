import { useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { cardTone, swipeDecision } from "../practice/cards";
import type { OfficeWord } from "../practice/words";

type Props = {
  index: number;
  count: number;
  word: OfficeWord;
  flipped: boolean;
  done: boolean;
  choices: OfficeWord[];
  onFlip: () => void;
  onPick: (id: string) => void;
  onJump: (delta: -1 | 1) => void;
};

function Chevron({ dir }: { dir: "left" | "right" }) {
  const d = dir === "left" ? "M11.5 3.5 L6 9 L11.5 14.5" : "M6.5 3.5 L12 9 L6.5 14.5";
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function WordCard({ index, count, word, flipped, done, choices, onFlip, onPick, onJump }: Props) {
  const wellRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: number; x0: number; y0: number; active: boolean } | null>(null);
  const [tracked, setTracked] = useState(word.id);
  const [picked, setPicked] = useState<string | null>(done ? word.id : null);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);

  if (tracked !== word.id) {
    setTracked(word.id);
    setPicked(done ? word.id : null);
    setDragX(0);
    setDragging(false);
  } else if (done && picked !== word.id) {
    setPicked(word.id);
  }

  function leave(dir: -1 | 1) {
    if (count < 2) return;
    drag.current = null;
    onJump(dir);
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || count < 2) return;
    if ((event.target as HTMLElement).closest("button")) return;
    drag.current = { id: event.pointerId, x0: event.clientX, y0: event.clientY, active: false };
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const current = drag.current;
    if (!current || event.pointerId !== current.id) return;
    const dx = event.clientX - current.x0;
    const dy = event.clientY - current.y0;
    if (!current.active) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      if (Math.abs(dy) > Math.abs(dx)) {
        drag.current = null;
        setDragX(0);
        return;
      }
      current.active = true;
      setDragging(true);
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        /* The pointer can already be gone. */
      }
    }
    setDragX(dx);
  }

  function finishDrag(event: PointerEvent<HTMLDivElement>) {
    const current = drag.current;
    if (!current || event.pointerId !== current.id) return;
    const dx = event.clientX - current.x0;
    const dy = event.clientY - current.y0;
    drag.current = null;
    setDragging(false);
    if (!current.active) {
      setDragX(0);
      return;
    }
    const width = wellRef.current?.clientWidth || 320;
    const dir = swipeDecision(dx, dy, width);
    if (dir === 0) {
      setDragX(0);
      return;
    }
    leave(dir);
  }

  function pick(id: string) {
    if (picked === word.id) return;
    setPicked(id);
    if (id === word.id) onPick(id);
  }

  const tone = cardTone(index);
  const say = word.say?.trim();
  const style = {
    background: tone.bg,
    color: tone.ink,
    "--card-ink": tone.ink,
    "--card-soft": tone.soft,
    ...(dragX !== 0 ? { transform: `translate3d(${dragX}px, 0, 0)` } : null),
  } as CSSProperties;

  return (
    <div className="deck-stage">
      <div
        className="deck-well"
        ref={wellRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
      >
        <article
          className={dragging ? "flash-card word-card is-drag" : "flash-card word-card"}
          data-card-tone={tone.id}
          style={style}
          aria-roledescription="flash card"
          aria-label={`${word.en}. ${index + 1} / ${count}`}
        >
          <p className="card-kicker">
            <span>Office words</span>
            <span>办公词汇</span>
          </p>
          {flipped ? (
            <>
              <h2 className="word-face" lang="zh-CN">
                {word.zh}
              </h2>
              <p className="word-example" lang="en">
                {word.example}
              </p>
              <p className="word-example" lang="zh-CN">
                {word.exampleZh}
              </p>
            </>
          ) : (
            <>
              <h2 className="word-face" id="word-face" lang="en">
                {word.en}
              </h2>
              {say ? (
                <p className="word-say" lang="en">
                  Say “{say}”
                </p>
              ) : null}
              <div className="word-quiz" id="word-quiz" role="group" aria-label="Pick the meaning. 选意思">
                {choices.map((choice) => {
                  const right = picked === choice.id && choice.id === word.id;
                  const wrong = picked === choice.id && choice.id !== word.id;
                  return (
                    <button
                      key={choice.id}
                      type="button"
                      className={right ? "is-right" : wrong ? "is-wrong" : undefined}
                      aria-pressed={right}
                      onClick={() => pick(choice.id)}
                    >
                      {choice.zh}
                    </button>
                  );
                })}
              </div>
            </>
          )}
          <button type="button" className="word-flip" id="word-flip" onClick={onFlip}>
            {flipped ? "Show the word · 看单词" : "Flip · 看意思"}
          </button>
          <p className="card-pos">
            {index + 1} / {count}
          </p>
        </article>
      </div>
      <div className="deck-arrows">
        <button type="button" className="deck-arrow" id="prev" aria-label="Previous word. 上一个" disabled={count < 2} onClick={() => leave(-1)}>
          <Chevron dir="left" />
        </button>
        <button type="button" className="deck-arrow" id="next" aria-label="Next word. 下一个" disabled={count < 2} onClick={() => leave(1)}>
          <Chevron dir="right" />
        </button>
      </div>
    </div>
  );
}
