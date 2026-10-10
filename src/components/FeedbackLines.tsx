import { feedbackLines, orderedFeedback, type FeedbackKind } from "../practice/feedback";
import type { SessionTally } from "../practice/session";
import type { Lang } from "../practice/types";

export function FeedbackLines({ lang, kind, session }: { lang: Lang; kind: FeedbackKind; session: SessionTally }) {
  const lines = orderedFeedback(lang, feedbackLines(kind, session));
  return (
    <div className="feedback" id="feedback">
      {lines.primary.map((line) => (
        <p key={`p-${line}`} className="primary">
          {line}
        </p>
      ))}
      {lines.secondary.map((line) => (
        <p key={`s-${line}`} className="secondary">
          {line}
        </p>
      ))}
    </div>
  );
}
