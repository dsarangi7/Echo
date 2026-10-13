import { pinyinPieces } from "../practice/pinyin";
import type { Lang } from "../practice/types";

type Props = {
  lang: Lang;
  text: string;
  marks: boolean[] | null;
  /** Dashed neutral chips. Recognition failure is not painted as a miss. */
  unrecognized?: boolean;
};

function toneClass(unrecognized: boolean, mark: boolean | undefined): string | undefined {
  if (unrecognized) return "unk";
  if (mark === undefined) return undefined;
  return mark ? "ok" : "bad";
}

export function TargetSentence({ lang, text, marks, unrecognized = false }: Props) {
  const tone = unrecognized ? "unsure" : "scored";
  if (lang === "en") {
    const parts = text.split(/(\s+)/);
    let wordIndex = 0;
    return (
      <p className="sentence" id="sentence" lang="en-US" data-tone={tone}>
        {parts.map((tok, i) => {
          if (/^\s+$/.test(tok)) return <span key={i}>{tok}</span>;
          const clean = tok.toLowerCase().replace(/[^a-z0-9'\-]/g, "");
          if (!clean) return <span key={i}>{tok}</span>;
          const mark = marks ? marks[wordIndex] : undefined;
          wordIndex += 1;
          return (
            <span key={i} className={toneClass(unrecognized, mark)}>
              {tok}
            </span>
          );
        })}
      </p>
    );
  }

  if (!/\p{Script=Han}/u.test(text)) {
    const pieces = pinyinPieces(text);
    let at = 0;
    return (
      <p className="sentence pinyin" id="sentence" lang="zh-Latn" data-tone={tone}>
        {pieces.map((piece, i) => {
          if (piece.marks === 0) return <span key={i}>{piece.text}</span>;
          const slice = marks ? marks.slice(at, at + piece.marks) : [];
          at += piece.marks;
          const mark = slice.length === 0 ? undefined : slice.every(Boolean);
          return (
            <span key={i} className={toneClass(unrecognized, mark)}>
              {piece.text}
            </span>
          );
        })}
      </p>
    );
  }

  let charIndex = 0;
  return (
    <p className="sentence" id="sentence" lang="zh-CN" data-tone={tone}>
      {Array.from(text).map((ch, i) => {
        const isChar = /\S/.test(ch) && !/[\p{P}\p{S}]/u.test(ch);
        if (!isChar) return <span key={i}>{ch}</span>;
        const mark = marks ? marks[charIndex] : undefined;
        charIndex += 1;
        return (
          <span key={i} className={toneClass(unrecognized, mark)}>
            {ch}
          </span>
        );
      })}
    </p>
  );
}
