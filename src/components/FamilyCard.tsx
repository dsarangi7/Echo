import { useEffect, useRef, type CSSProperties, type KeyboardEvent } from "react";
import { anchorOf, familyTitle, type FamilyLesson } from "../practice/families";

type Props = {
  lesson: FamilyLesson;
};

/**
 * One character family on a horizontal timeline.
 * The anchor is blue. Earlier and later relatives stay gray.
 * Narrow screens scroll the line sideways instead of wrapping it.
 */
export function FamilyCard({ lesson }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const anchor = anchorOf(lesson);
  const title = familyTitle(lesson);
  const style = { "--family-count": String(lesson.members.length) } as CSSProperties;

  useEffect(() => {
    const scroller = scrollRef.current;
    const node = scroller?.querySelector<HTMLElement>(".is-anchor");
    if (!scroller || !node) return;
    const scrollerBox = scroller.getBoundingClientRect();
    const nodeBox = node.getBoundingClientRect();
    const delta = nodeBox.left - scrollerBox.left - (scrollerBox.width - nodeBox.width) / 2;
    scroller.scrollLeft = Math.max(0, scroller.scrollLeft + delta);
  }, [lesson.id]);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    const scroller = scrollRef.current;
    if (!scroller || scroller.scrollWidth <= scroller.clientWidth + 1) return;
    event.preventDefault();
    event.stopPropagation();
    scroller.scrollBy({ left: event.key === "ArrowRight" ? 96 : -96 });
  }

  return (
    <article className="family-card" data-family={lesson.id} aria-labelledby="family-title">
      <h2 className="family-title" id="family-title">
        The <span lang="zh-CN">{lesson.hanzi}</span> family, anchored on <span lang="zh-CN">{anchor?.zh ?? lesson.hanzi}</span>
      </h2>
      <div
        className="family-scroll"
        ref={scrollRef}
        tabIndex={0}
        role="region"
        aria-label={`Timeline, ${lesson.earlier.en} to ${lesson.later.en}. 从${lesson.earlier.zh}到${lesson.later.zh}，可左右滑动。`}
        onKeyDown={onKeyDown}
      >
        <div className="family-board" style={style}>
          <p className="family-ends">
            <span>
              ← {lesson.earlier.en} <span lang="zh-CN">{lesson.earlier.zh}</span>
            </span>
            <span>
              {lesson.later.en} <span lang="zh-CN">{lesson.later.zh}</span> →
            </span>
          </p>
          <div className="family-line" aria-hidden="true" />
          <ol className="family-nodes">
            {lesson.members.map((member) => {
              const on = member.id === lesson.anchor;
              return (
                <li key={member.id} className={on ? "is-anchor" : undefined} aria-current={on ? "true" : undefined}>
                  <span className="family-dot" aria-hidden="true">
                    <i />
                  </span>
                  <span className="family-hanzi" lang="zh-CN">
                    {member.zh}
                  </span>
                  <span className="family-py" lang="zh-Latn">
                    {member.py}
                  </span>
                  <span className="family-gloss">{member.en}</span>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </article>
  );
}
