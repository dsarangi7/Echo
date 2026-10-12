import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { cardTone, directionWithin, swipeDecision } from "../practice/cards";
import type { Lang } from "../practice/types";
import { TargetSentence } from "./TargetSentence";

type Props = {
  index: number;
  setStart: number;
  setCount: number;
  setPos: number;
  setTitle: string;
  setSub: string;
  nextIndex: number;
  prevIndex: number;
  lang: Lang;
  primary: string;
  meaning: string;
  marks: boolean[] | null;
  unrecognized: boolean;
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

export function FlashCard({
  index,
  setStart,
  setCount,
  setPos,
  setTitle,
  setSub,
  nextIndex,
  prevIndex,
  lang,
  primary,
  meaning,
  marks,
  unrecognized,
  onJump,
}: Props) {
  const wellRef = useRef<HTMLDivElement>(null);
  const onJumpRef = useRef(onJump);
  const drag = useRef<{ id: number; x0: number; y0: number; active: boolean } | null>(null);
  const intent = useRef<-1 | 1 | 0>(0);
  const [tracked, setTracked] = useState(index);
  const [dragX, setDragX] = useState(0);
  const [motion, setMotion] = useState<-1 | 1 | 0>(0);
  const [dragging, setDragging] = useState(false);

  onJumpRef.current = onJump;

  if (tracked !== index) {
    setTracked(index);
    setDragX(0);
    setDragging(false);
    setMotion(intent.current || directionWithin(setStart, setCount, tracked, index));
  }

  useEffect(() => {
    intent.current = 0;
  }, [index]);

  function leave(dir: -1 | 1) {
    if (setCount < 2) return;
    drag.current = null;
    intent.current = dir;
    onJumpRef.current(dir);
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || setCount < 2) return;
    drag.current = { id: event.pointerId, x0: event.clientX, y0: event.clientY, active: false };
    setMotion(0);
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
        /* The pointer can already be gone. Move events still update the card. */
      }
    }
    setDragX(dx);
  }

  function finish(event: PointerEvent<HTMLDivElement>) {
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

  const tone = cardTone(index);
  const peekTone = dragX < 0 ? cardTone(nextIndex) : cardTone(prevIndex);
  const style = {
    background: tone.bg,
    color: tone.ink,
    "--card-ink": tone.ink,
    "--card-soft": tone.soft,
    ...(dragX !== 0 ? { transform: `translate3d(${dragX}px, 0, 0)` } : null),
  } as CSSProperties;
  const cardClass = [
    "flash-card",
    motion === 1 ? "enter-next" : "",
    motion === -1 ? "enter-prev" : "",
    dragging ? "is-drag" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="deck-stage">
      <div
        className="deck-well"
        ref={wellRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finish}
        onPointerCancel={finish}
      >
        {dragX !== 0 ? (
          <div
            className="deck-peek"
            aria-hidden="true"
            style={{
              background: peekTone.bg,
              width: Math.min(Math.abs(dragX), 36),
              left: dragX < 0 ? "auto" : 0,
              right: dragX < 0 ? 0 : "auto",
            }}
          />
        ) : null}
        <article
          key={index}
          className={cardClass}
          data-card-tone={tone.id}
          style={style}
          aria-roledescription="flash card"
          aria-label={`${setTitle}. ${setPos} / ${setCount}`}
          onAnimationEnd={() => setMotion(0)}
        >
          <p className="card-kicker">
            <span>{setTitle}</span>
            <span>{setSub}</span>
          </p>
          <div aria-live="polite">
            <TargetSentence lang={lang} text={primary} marks={marks} unrecognized={unrecognized} />
          </div>
          <p className="meaning" id="meaning" lang={lang === "en" ? "zh-CN" : "en-US"}>
            {meaning}
          </p>
          <p className="card-pos">
            {setPos} / {setCount}
          </p>
        </article>
      </div>
      <div className="deck-arrows">
        <button
          type="button"
          className="deck-arrow"
          id="prev"
          aria-label="Previous sentence. 上一句"
          disabled={setCount < 2}
          onClick={() => leave(-1)}
        >
          <Chevron dir="left" />
        </button>
        <button
          type="button"
          className="deck-arrow"
          id="next"
          aria-label="Next sentence. 下一句"
          disabled={setCount < 2}
          onClick={() => leave(1)}
        >
          <Chevron dir="right" />
        </button>
      </div>
    </div>
  );
}
