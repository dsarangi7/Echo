import type { Lang } from "../practice/types";

type Props = {
  lang: Lang;
  text: string;
  marks: boolean[] | null;
  /** Dashed neutral chips. Recognition failure is not painted as a miss. */
  unrecognized?: boolean;
};

export function TargetSentence({ lang, text, marks, unrecognized = false }: Props) {
  if (lang === "en") {
    const parts = text.split(/(\s+)/);
    let wordIndex = 0;
    return (
      <p className="sentence" id="sentence" lang="en-US" data-tone={unrecognized ? "unsure" : "scored"}>
        {parts.map((tok, i) => {
          if (/^\s+$/.test(tok)) return <span key={i}>{tok}</span>;
          const clean = tok.toLowerCase().replace(/[^a-z0-9'\-]/g, "");
          if (!clean) return <span key={i}>{tok}</span>;
          const mark = marks ? marks[wordIndex] : undefined;
          wordIndex += 1;
          const className = unrecognized ? "unk" : mark === undefined ? undefined : mark ? "ok" : "bad";
          return (
            <span key={i} className={className}>
              {tok}
            </span>
          );
        })}
      </p>
    );
  }

  let charIndex = 0;
  return (
    <p className="sentence" id="sentence" lang="zh-CN" data-tone={unrecognized ? "unsure" : "scored"}>
      {Array.from(text).map((ch, i) => {
        const isChar = /\S/.test(ch) && !/[\p{P}\p{S}]/u.test(ch);
        if (!isChar) return <span key={i}>{ch}</span>;
        const mark = marks ? marks[charIndex] : undefined;
        charIndex += 1;
        const className = unrecognized ? "unk" : mark === undefined ? undefined : mark ? "ok" : "bad";
        return (
          <span key={i} className={className}>
            {ch}
          </span>
        );
      })}
    </p>
  );
}
