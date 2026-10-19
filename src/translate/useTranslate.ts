import { useCallback, useEffect, useRef, useState } from "react";
import type { CatMode, Lang } from "../practice/types";
import { packs } from "../practice/packs";
import {
  MIN_SPEECH_MS,
  SHORT_ZH_MIN_SPEECH_MS,
  createRecordingContext,
  isSecurePage,
  micFailureMessage,
  releaseStream,
  requestMicrophone,
  startCapture,
  type CaptureHandle,
} from "../speech/record";
import { resampleTo16k } from "../speech/resample";
import { ensureModel, transcribe } from "../speech/stt";
import { hearFailCopy, speakLine, speakPlain, stopSpeaking } from "../speech/tts";
import {
  COPIED_NOTE,
  COPY_FAIL_NOTE,
  LISTENING_NOTE,
  NO_SPEECH_NOTE,
  STT_FAIL_NOTE,
  TRANSCRIBING_NOTE,
  TRANSLATING_NOTE,
  TRANSLATE_FAIL_COPY,
  resolvePair,
  translateSentence,
  type DirectionChoice,
} from "./engine";

export type TranslatePhase = "idle" | "listening" | "transcribing" | "translating";
export type TranslateTone = "ok" | "error";

function packClip(lang: Lang, text: string): number | null {
  const needle = text.trim();
  if (!needle) return null;
  const index = packs[lang].findIndex((row) => (lang === "en" ? row.en : row.zh) === needle);
  return index >= 0 ? index : null;
}

export function useTranslate() {
  const [choice, setChoice] = useState<DirectionChoice>("auto");
  const [text, setText] = useState("");
  const [result, setResult] = useState("");
  const [resultLang, setResultLang] = useState<Lang | null>(null);
  const [note, setNote] = useState("");
  const [tone, setTone] = useState<TranslateTone>("ok");
  const [phase, setPhase] = useState<TranslatePhase>("idle");
  const [catMode, setCatMode] = useState<CatMode>("idle");
  const [mouth, setMouth] = useState(0);

  const choiceRef = useRef(choice);
  const textRef = useRef(text);
  const resultRef = useRef(result);
  const resultLangRef = useRef(resultLang);
  const tokenRef = useRef(0);
  const captureRef = useRef<CaptureHandle | null>(null);
  choiceRef.current = choice;
  textRef.current = text;
  resultRef.current = result;
  resultLangRef.current = resultLang;

  const fail = useCallback((message: string) => {
    setTone("error");
    setNote(message);
    setPhase("idle");
    setCatMode("idle");
    setMouth(0);
  }, []);

  const runTranslate = useCallback(
    async (raw: string, token: number) => {
      setPhase("translating");
      setTone("ok");
      setNote(TRANSLATING_NOTE);
      setResult("");
      setResultLang(null);
      const outcome = await translateSentence(raw, choiceRef.current);
      if (token !== tokenRef.current) return;
      if (!outcome.ok) {
        fail(TRANSLATE_FAIL_COPY[outcome.failure ?? "unavailable"]);
        return;
      }
      setPhase("idle");
      setCatMode("idle");
      setResult(outcome.text);
      setResultLang(outcome.target);
      setTone("ok");
      setNote("");
    },
    [fail],
  );

  const quiet = useCallback(() => {
    tokenRef.current += 1;
    captureRef.current?.cancel();
    captureRef.current = null;
    stopSpeaking();
    setPhase("idle");
    setCatMode("idle");
    setMouth(0);
    setNote((current) =>
      current === LISTENING_NOTE || current === TRANSCRIBING_NOTE || current === TRANSLATING_NOTE ? "" : current,
    );
  }, []);

  useEffect(
    () => () => {
      tokenRef.current += 1;
      captureRef.current?.cancel();
      captureRef.current = null;
      stopSpeaking();
    },
    [],
  );

  const onText = useCallback((value: string) => {
    textRef.current = value;
    setText(value);
    setResult("");
    setResultLang(null);
    setTone("ok");
    setNote("");
  }, []);

  const onChoice = useCallback((next: DirectionChoice) => {
    choiceRef.current = next;
    setChoice(next);
  }, []);

  const onTranslate = useCallback(() => {
    if (captureRef.current || phase !== "idle") return;
    const token = ++tokenRef.current;
    stopSpeaking();
    setCatMode("idle");
    setMouth(0);
    void runTranslate(textRef.current, token);
  }, [phase, runTranslate]);

  const onSwap = useCallback(() => {
    if (phase !== "idle") return;
    const pair = resolvePair(textRef.current, choiceRef.current);
    const next: DirectionChoice = pair.source === "en" ? "zh-en" : "en-zh";
    const currentText = textRef.current;
    const currentResult = resultRef.current.trim();
    choiceRef.current = next;
    setChoice(next);
    setTone("ok");
    setNote("");
    if (!currentResult) {
      if (!currentText.trim()) return;
      const token = ++tokenRef.current;
      stopSpeaking();
      setCatMode("idle");
      setMouth(0);
      void runTranslate(currentText, token);
      return;
    }
    textRef.current = currentResult;
    resultRef.current = currentText.trim();
    setText(currentResult);
    setResult(currentText.trim());
    setResultLang(pair.source);
  }, [phase, runTranslate]);

  const onSpeak = useCallback(() => {
    if (captureRef.current) {
      captureRef.current.finish();
      return;
    }
    if (phase !== "idle") return;
    const source = resolvePair(textRef.current, choiceRef.current).source;
    const streamPromise = requestMicrophone();
    let audioCtx: AudioContext;
    try {
      audioCtx = createRecordingContext();
      void audioCtx.resume();
    } catch {
      void releaseStream(streamPromise);
      fail(micFailureMessage("failed", { secure: isSecurePage() }));
      return;
    }
    void ensureModel().catch(() => undefined);
    const token = ++tokenRef.current;
    stopSpeaking();
    setMouth(0);
    setCatMode("listen");
    setPhase("listening");
    setTone("ok");
    setNote(LISTENING_NOTE);

    const capture = startCapture(audioCtx, streamPromise, {
      maxMs: 20000,
      silenceMs: 900,
      minSpeechMs: source === "zh" ? SHORT_ZH_MIN_SPEECH_MS : MIN_SPEECH_MS,
      onLevel: (rms) => {
        if (token !== tokenRef.current) return;
        setMouth(Math.min(1, rms * 8));
      },
    });
    captureRef.current = capture;

    void (async () => {
      const recorded = await capture.done;
      if (captureRef.current === capture) captureRef.current = null;
      if (token !== tokenRef.current || recorded === "cancelled") return;
      setMouth(0);
      setCatMode("idle");
      if (recorded === "denied" || recorded === "no-mic" || recorded === "failed") {
        fail(micFailureMessage(recorded, { secure: isSecurePage() }));
        return;
      }
      if (recorded === "no-speech") {
        fail(NO_SPEECH_NOTE);
        return;
      }
      setPhase("transcribing");
      setTone("ok");
      setNote(TRANSCRIBING_NOTE);
      try {
        const pcm = resampleTo16k(recorded.samples, recorded.sampleRate);
        const spoken = (await transcribe(pcm, source, "")).trim();
        if (token !== tokenRef.current) return;
        if (!spoken) {
          fail(NO_SPEECH_NOTE);
          return;
        }
        textRef.current = spoken;
        setText(spoken);
        await runTranslate(spoken, token);
      } catch (err) {
        if (token !== tokenRef.current) return;
        console.error("translate-stt", err instanceof Error ? err.message : String(err));
        fail(STT_FAIL_NOTE);
      }
    })();
  }, [fail, phase, runTranslate]);

  const onHear = useCallback(() => {
    const line = resultRef.current.trim();
    const lang = resultLangRef.current;
    if (!line || !lang || phase !== "idle") return;
    const token = ++tokenRef.current;
    captureRef.current?.cancel();
    captureRef.current = null;
    const handlers = {
      onStart: () => {
        if (token !== tokenRef.current) return;
        setCatMode("talk");
      },
      onMouth: (open: number) => {
        if (token !== tokenRef.current) return;
        setMouth(open);
      },
      onEnd: () => {
        if (token !== tokenRef.current) return;
        setMouth(0);
        setCatMode("idle");
      },
      onUnavailable: (reason: Parameters<typeof hearFailCopy>[0]) => {
        if (token !== tokenRef.current) return;
        setMouth(0);
        setCatMode("idle");
        setTone("error");
        setNote(hearFailCopy(reason));
      },
    };
    const clip = packClip(lang, line);
    if (clip != null) speakLine(lang, clip, line, handlers, 1);
    else speakPlain(lang, line, handlers, 1);
  }, [phase]);

  const onCopy = useCallback(async () => {
    const line = resultRef.current.trim();
    if (!line || phase !== "idle") return;
    try {
      if (!navigator.clipboard?.writeText) throw new Error("clipboard missing");
      await navigator.clipboard.writeText(line);
      setTone("ok");
      setNote(COPIED_NOTE);
    } catch {
      setTone("error");
      setNote(COPY_FAIL_NOTE);
    }
  }, [phase]);

  return {
    choice,
    text,
    result,
    resultLang,
    note,
    tone,
    phase,
    catMode,
    mouth,
    onChoice,
    onText,
    onSwap,
    onTranslate,
    onSpeak,
    onHear,
    onCopy,
    quiet,
  };
}
