import { useState } from "react";
import { UNSURE_TIP, feedbackLines, orderedFeedback } from "../practice/feedback";
import type { SessionTally } from "../practice/session";
import type { Lang } from "../practice/types";

type Props = {
  lang: Lang;
  session: SessionTally;
  onReset: () => void;
};

export function SessionStrip({ lang, session, onReset }: Props) {
  const [tipOpen, setTipOpen] = useState(false);
  const summary = orderedFeedback(lang, feedbackLines(session.started ? "end" : "start", session));

  return (
    <div className="session-strip" id="session-strip">
      <div className="session-counts" aria-label="This session">
        <span className="session-count clear">
          <b>{session.clear}</b>
          <span>Clear</span>
          <small>听清</small>
        </span>
        <span className="session-count partial">
          <b>{session.partial}</b>
          <span>Partial</span>
          <small>部分</small>
        </span>
        <button
          type="button"
          className="session-count unsure"
          id="mic-unsure"
          aria-expanded={tipOpen}
          onClick={() => setTipOpen((open) => !open)}
        >
          <b>{session.unsure}</b>
          <span>Mic unsure</span>
          <small>识别不准</small>
        </button>
        {session.streak > 0 ? (
          <span className="session-stars" id="session-stars" title="Practice encouragement for clear lines">
            ★×{session.streak}
          </span>
        ) : null}
      </div>
      <div className="session-summary" id="session-summary">
        {summary.primary.map((line) => (
          <p key={line} className="primary">
            {line}
          </p>
        ))}
        {summary.secondary.map((line) => (
          <p key={line} className="secondary">
            {line}
          </p>
        ))}
      </div>
      {tipOpen ? (
        <p className="unsure-tip" id="unsure-tip" role="status">
          <b>{UNSURE_TIP.en}</b>
          <small>{UNSURE_TIP.zh}</small>
        </p>
      ) : null}
      <button type="button" className="act ghost session-reset" id="reset-session" onClick={onReset}>
        <b>Reset session</b>
        <small>重置本局</small>
      </button>
    </div>
  );
}
