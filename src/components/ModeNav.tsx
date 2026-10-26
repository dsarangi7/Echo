import { useEffect, useRef, useState } from "react";

export type EchoMode = "practice" | "translate" | "words";

export type ModeDeck = {
  id: string;
  name: string;
  zh: string;
};

type Props = {
  mode: EchoMode;
  onChange: (mode: EchoMode) => void;
  /** Word decks for the language being practiced. Empty hides the tab. */
  decks?: readonly ModeDeck[];
  deckId?: string | null;
  onPickDeck?: (id: string) => void;
};

export function ModeNav({ mode, onChange, decks = [], deckId = null, onPickDeck }: Props) {
  const [open, setOpen] = useState(false);
  const deckRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const showDecks = decks.length > 0;

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!deckRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      toggleRef.current?.focus();
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!showDecks) setOpen(false);
  }, [showDecks]);

  function pickMode(next: EchoMode) {
    setOpen(false);
    onChange(next);
  }

  function pickDeck(id: string) {
    setOpen(false);
    onPickDeck?.(id);
  }

  return (
    <nav className="mode-nav" aria-label="Mode. 模式">
      <div className={showDecks ? "mode-switch has-decks" : "mode-switch"} role="group" aria-label="Mode. 模式">
        <button
          type="button"
          id="mode-translate"
          className={mode === "translate" ? "on" : undefined}
          aria-pressed={mode === "translate"}
          onClick={() => pickMode("translate")}
        >
          <span>Translate</span>
          <small>翻译</small>
        </button>
        <button
          type="button"
          id="mode-practice"
          className={mode === "practice" ? "on" : undefined}
          aria-pressed={mode === "practice"}
          onClick={() => pickMode("practice")}
        >
          <span>Practice</span>
          <small>练习</small>
        </button>
        {showDecks ? (
          <div className="mode-deck" ref={deckRef}>
            <button
              type="button"
              id="mode-words"
              ref={toggleRef}
              className={mode === "words" ? "on" : undefined}
              aria-pressed={mode === "words"}
              aria-expanded={open}
              aria-haspopup="menu"
              aria-controls="word-deck-menu"
              onClick={() => setOpen((value) => !value)}
            >
              <span>
                Word decks
                <i className={open ? "mode-caret is-open" : "mode-caret"} aria-hidden="true" />
              </span>
              <small>单词卡</small>
            </button>
            <div className="mode-menu" id="word-deck-menu" role="menu" hidden={!open} aria-label="Word decks. 单词卡">
              {decks.map((deck) => {
                const selected = mode === "words" && deck.id === deckId;
                return (
                  <button
                    key={deck.id}
                    type="button"
                    id={`word-deck-${deck.id}`}
                    role="menuitemradio"
                    aria-checked={selected}
                    className={selected ? "on" : undefined}
                    onClick={() => pickDeck(deck.id)}
                  >
                    <b>{deck.name}</b>
                    <small>{deck.zh}</small>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </nav>
  );
}
