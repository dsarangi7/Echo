export type EchoMode = "practice" | "translate";

type Props = {
  mode: EchoMode;
  onChange: (mode: EchoMode) => void;
};

export function ModeNav({ mode, onChange }: Props) {
  return (
    <nav className="mode-nav" aria-label="Mode. 模式">
      <div className="mode-switch" role="group" aria-label="Mode. 模式">
        <button
          type="button"
          id="mode-practice"
          className={mode === "practice" ? "on" : undefined}
          aria-pressed={mode === "practice"}
          onClick={() => onChange("practice")}
        >
          <span>Practice</span>
          <small>练习</small>
        </button>
        <button
          type="button"
          id="mode-translate"
          className={mode === "translate" ? "on" : undefined}
          aria-pressed={mode === "translate"}
          onClick={() => onChange("translate")}
        >
          <span>Translate</span>
          <small>翻译</small>
        </button>
      </div>
    </nav>
  );
}
