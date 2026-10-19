import type { Lang } from "../practice/types";
import {
  directionHint,
  pairLabel,
  resolvePair,
  TRANSLATE_MAX_CHARS,
  type DirectionChoice,
} from "../translate/engine";
import type { TranslatePhase, TranslateTone } from "../translate/useTranslate";

export type TranslatePanelProps = {
  choice: DirectionChoice;
  text: string;
  result: string;
  resultLang: Lang | null;
  note: string;
  tone: TranslateTone;
  phase: TranslatePhase;
  onChoice: (choice: DirectionChoice) => void;
  onText: (text: string) => void;
  onSwap: () => void;
  onTranslate: () => void;
  onSpeak: () => void;
  onHear: () => void;
  onCopy: () => void;
};

const DIRECTIONS: { id: DirectionChoice; label: string; hint: string }[] = [
  { id: "auto", label: "Auto", hint: "自动" },
  { id: "en-zh", label: "EN → 中文", hint: "英到中" },
  { id: "zh-en", label: "中文 → EN", hint: "中到英" },
];

export function TranslatePanel({
  choice,
  text,
  result,
  resultLang,
  note,
  tone,
  phase,
  onChoice,
  onText,
  onSwap,
  onTranslate,
  onSpeak,
  onHear,
  onCopy,
}: TranslatePanelProps) {
  const pair = resolvePair(text, choice);
  const hint = directionHint(text, choice);
  const locked = phase !== "idle";
  const listening = phase === "listening";
  const speakHint = listening ? "点此结束" : pair.source === "zh" ? "说中文" : "说英语";
  const previewLead = pair.detected ? "Detected · 已识别" : choice === "auto" ? "Auto · 自动" : "Direction · 方向";

  return (
    <section className="card translate-card" aria-label="Translate. 翻译" aria-busy={locked}>
      <div className="translate-dir">
        <p className="pace-label" id="translate-dir-label">
          <b>Direction</b>
          <span>方向</span>
        </p>
        <div className="pace-switch translate-switch" role="group" aria-labelledby="translate-dir-label">
          {DIRECTIONS.map((row) => (
            <button
              key={row.id}
              type="button"
              id={`dir-${row.id}`}
              className={choice === row.id ? "on" : undefined}
              aria-pressed={choice === row.id}
              disabled={locked}
              onClick={() => onChoice(row.id)}
            >
              <span>{row.label}</span>
              <small>{row.hint}</small>
            </button>
          ))}
        </div>
        <button type="button" className="act ghost translate-swap" id="translate-swap" disabled={locked} onClick={onSwap}>
          <b>Swap</b>
          <small>对调</small>
        </button>
      </div>

      <p className="translate-hint" id="translate-preview">
        {previewLead}
        <b>{pairLabel(pair.source)}</b>
      </p>
      {hint ? <p className="translate-mismatch">{hint}</p> : null}

      <label className="translate-label" htmlFor="translate-source">
        <b>Sentence</b>
        <small>句子</small>
      </label>
      <textarea
        id="translate-source"
        className="translate-field"
        value={text}
        maxLength={TRANSLATE_MAX_CHARS}
        rows={4}
        placeholder="Type a sentence, or tap Speak. 打一句，或点「说一句」。"
        lang={choice === "zh-en" ? "zh-CN" : choice === "en-zh" ? "en" : undefined}
        enterKeyHint="go"
        disabled={locked}
        onChange={(event) => onText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
            event.preventDefault();
            onTranslate();
          }
        }}
      />
      <p className={text.length >= TRANSLATE_MAX_CHARS ? "translate-count warn" : "translate-count"}>
        {text.length} / {TRANSLATE_MAX_CHARS}
      </p>

      <div className="actions">
        <button type="button" className="act primary" id="translate-go" disabled={locked} onClick={onTranslate}>
          <b>{phase === "translating" ? "Translating" : "Translate"}</b>
          <small>{phase === "translating" ? "翻译中" : "翻译"}</small>
        </button>
        <button
          type="button"
          className={listening ? "act primary live" : "act primary"}
          id="translate-say"
          aria-pressed={listening}
          disabled={phase === "transcribing" || phase === "translating"}
          onClick={onSpeak}
        >
          <b>{listening ? "Stop" : "Speak"}</b>
          <small>{speakHint}</small>
        </button>
      </div>

      <div className="translate-live" aria-live="polite">
        {note ? (
          <p className={tone === "error" ? "notice-line translate-note" : "translate-status"} id="translate-note" role="status">
            {note}
          </p>
        ) : null}
        {result && resultLang ? (
          <div className="translate-out">
            <p className="translate-kicker">
              <b>{resultLang === "zh" ? "中文" : "English"}</b>
              <span>{resultLang === "zh" ? "Simplified Chinese" : "英语"}</span>
            </p>
            <p className="translate-line" id="translate-result" lang={resultLang === "zh" ? "zh-CN" : "en"}>
              {result}
            </p>
            <div className="actions">
              <button type="button" className="act primary" id="translate-hear" disabled={locked} onClick={onHear}>
                <b>Hear it</b>
                <small>听一听</small>
              </button>
              <button type="button" className="act ghost" id="translate-copy" disabled={locked} onClick={onCopy}>
                <b>Copy</b>
                <small>复制</small>
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
