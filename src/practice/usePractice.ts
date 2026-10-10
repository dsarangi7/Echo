import { useCallback, useEffect, useRef, useState } from "react";
import { packError, packs } from "./packs";
import { gradeTranscript } from "./score";
import { hearPaceRate, type HearPace } from "./pace";
import { loadHearPaces, loadIndexes, loadLang, saveHearPaces, saveIndexes, saveLang } from "./storage";
import type { CaptureHandle, MicFailure } from "../speech/record";
import {
  createRecordingContext,
  isSecurePage,
  micFailureMessage,
  releaseStream,
  requestMicrophone,
  startCapture,
} from "../speech/record";
import { resampleTo16k } from "../speech/resample";
import { introLine } from "../speech/intro";
import { DOWNLOAD_LABEL } from "../speech/model";
import { ensureModel, subscribeModel, transcribe } from "../speech/stt";
import { HEAR_FAIL, setSpeakingRate, speakIntro, speakLine, stopSpeaking } from "../speech/tts";
import type { CatMode, Lang, Sentence } from "./types";

function micNote(kind: MicFailure): string {
  return micFailureMessage(kind, { secure: isSecurePage() });
}

const PROMPT_EN = "Tap Hear it, then Say it. 先听一听，再说一说。";
const PROMPT_ZH = "点「听一听」，再点「说一说」。 Hear it, then say it.";

function primaryText(lang: Lang, item: Sentence): string {
  return lang === "en" ? item.en : item.zh;
}

export function usePractice() {
  const [lang, setLang] = useState<Lang>(loadLang);
  const [indexes, setIndexes] = useState(loadIndexes);
  const [paces, setPaces] = useState(loadHearPaces);
  const [marks, setMarks] = useState<boolean[] | null>(null);
  const [catMode, setCatMode] = useState<CatMode>("idle");
  const [mouth, setMouth] = useState(0);
  const [kicker, setKicker] = useState("Hello");
  const [heard, setHeard] = useState(() => introLine(loadLang()));
  const [score, setScore] = useState("");
  const [modelNote, setModelNote] = useState(DOWNLOAD_LABEL);
  const [listening, setListening] = useState(false);
  const [runtimeError, setRuntimeError] = useState("");

  const tokenRef = useRef(0);
  const captureRef = useRef<CaptureHandle | null>(null);
  const langRef = useRef<Lang>(lang);
  const indexRef = useRef(0);
  const paceRef = useRef(paces);
  const timersRef = useRef<number[]>([]);

  const pack = packs[lang];
  const index = Math.min(indexes[lang], pack.length - 1);
  const item = pack[index];
  langRef.current = lang;
  indexRef.current = index;
  paceRef.current = paces;
  const pace = paces[lang];

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((id) => {
      window.clearTimeout(id);
      window.clearInterval(id);
    });
    timersRef.current = [];
  }, []);

  const resetPractice = useCallback(() => {
    setMarks(null);
    setKicker("Practice");
    setScore("");
    setHeard(langRef.current === "en" ? PROMPT_EN : PROMPT_ZH);
  }, []);

  const stopAudio = useCallback(() => {
    tokenRef.current += 1;
    stopSpeaking();
    captureRef.current?.cancel();
    captureRef.current = null;
    setListening(false);
    clearTimers();
    setMouth(0);
    setCatMode("idle");
  }, [clearTimers]);

  useEffect(() => {
    saveIndexes(indexes);
  }, [indexes]);

  useEffect(() => {
    saveHearPaces(paces);
  }, [paces]);

  useEffect(() => {
    document.title = lang === "en" ? "课猫 Echo · English practice" : "课猫 Echo · 中文口语练习";
    document.documentElement.lang = lang === "en" ? "en" : "zh-CN";
  }, [lang]);

  const noteFailure = useCallback((message: string) => {
    setCatMode("idle");
    setListening(false);
    setMouth(0);
    setKicker("Note");
    setScore("");
    setHeard(message);
  }, []);

  const playIntro = useCallback(
    (next: Lang, quiet = false) => {
      const token = ++tokenRef.current;
      captureRef.current?.cancel();
      captureRef.current = null;
      setListening(false);
      clearTimers();
      setMarks(null);
      setScore("");
      setMouth(0);
      setCatMode("idle");
      setKicker("Hello");
      setHeard(introLine(next));
      speakIntro(next, {
        onStart: () => {
          if (token !== tokenRef.current) return;
          setCatMode("talk");
        },
        onMouth: (open) => {
          if (token !== tokenRef.current) return;
          setMouth(open);
        },
        onEnd: () => {
          if (token !== tokenRef.current) return;
          clearTimers();
          setMouth(0);
          setCatMode("idle");
        },
        onUnavailable: () => {
          if (token !== tokenRef.current) return;
          setMouth(0);
          setCatMode("idle");
          // A page-load intro can be blocked before the first tap. Hear it stays usable.
          if (!quiet) noteFailure(HEAR_FAIL);
        },
      }, hearPaceRate(paceRef.current[next]));
    },
    [clearTimers, noteFailure],
  );

  useEffect(() => {
    void ensureModel().catch(() => undefined);
    playIntro(langRef.current, true);
    return () => {
      tokenRef.current += 1;
      stopSpeaking();
    };
  }, [playIntro]);

  useEffect(() => {
    const synth = window.speechSynthesis;
    synth?.getVoices();
    const onVoices = () => synth?.getVoices();
    synth?.addEventListener("voiceschanged", onVoices);
    const onError = (event: ErrorEvent) => setRuntimeError(event.message || "error");
    window.addEventListener("error", onError);
    const unsubscribe = subscribeModel(setModelNote);
    return () => {
      synth?.removeEventListener("voiceschanged", onVoices);
      window.removeEventListener("error", onError);
      unsubscribe();
    };
  }, []);

  const jump = useCallback(
    (delta: number) => {
      stopAudio();
      const currentLang = langRef.current;
      const n = packs[currentLang].length;
      const next = indexRef.current + delta;
      const at = ((next % n) + n) % n;
      setIndexes((prev) => ({ ...prev, [currentLang]: at }));
      resetPractice();
    },
    [resetPractice, stopAudio],
  );

  const jumpTo = useCallback(
    (at: number) => {
      stopAudio();
      const currentLang = langRef.current;
      const n = packs[currentLang].length;
      const next = ((at % n) + n) % n;
      setIndexes((prev) => ({ ...prev, [currentLang]: next }));
      resetPractice();
    },
    [resetPractice, stopAudio],
  );

  const setLanguage = useCallback(
    (next: Lang) => {
      if (next === langRef.current) return;
      langRef.current = next;
      setLang(next);
      saveLang(next);
      playIntro(next);
    },
    [playIntro],
  );

  const hear = useCallback(() => {
    const token = ++tokenRef.current;
    captureRef.current?.cancel();
    captureRef.current = null;
    setListening(false);
    clearTimers();
    const currentLang = langRef.current;
    const line = primaryText(currentLang, packs[currentLang][indexRef.current]);
    speakLine(currentLang, indexRef.current, line, {
      onStart: () => {
        if (token !== tokenRef.current) return;
        setCatMode("talk");
      },
      onMouth: (open) => {
        if (token !== tokenRef.current) return;
        setMouth(open);
      },
      onEnd: () => {
        if (token !== tokenRef.current) return;
        clearTimers();
        setMouth(0);
        setCatMode("idle");
      },
      onUnavailable: () => {
        if (token !== tokenRef.current) return;
        noteFailure(HEAR_FAIL);
      },
    }, hearPaceRate(paceRef.current[currentLang]));
  }, [clearTimers, noteFailure]);

  const setPace = useCallback((next: HearPace) => {
    const currentLang = langRef.current;
    paceRef.current = { ...paceRef.current, [currentLang]: next };
    setPaces((prev) => (prev[currentLang] === next ? prev : { ...prev, [currentLang]: next }));
    setSpeakingRate(hearPaceRate(next));
  }, []);

  const sayIt = useCallback(() => {
    if (captureRef.current) {
      captureRef.current.finish();
      return;
    }
    // getUserMedia and AudioContext.resume have to start in this tap, before any await.
    const streamPromise = requestMicrophone();
    let audioCtx: AudioContext;
    try {
      audioCtx = createRecordingContext();
      void audioCtx.resume();
    } catch {
      void releaseStream(streamPromise);
      noteFailure(micFailureMessage("failed", { secure: isSecurePage() }));
      return;
    }
    void ensureModel().catch(() => undefined);
    const token = ++tokenRef.current;
    stopSpeaking();
    clearTimers();
    setMouth(0);
    setMarks(null);
    setScore("");
    setCatMode("listen");
    setListening(true);
    setKicker("Listening");
    setHeard(
      langRef.current === "en"
        ? "Listening… tap Say it again to finish."
        : "在听…再点一次「说一说」。",
    );

    const capture = startCapture(audioCtx, streamPromise, {
      maxMs: 15000,
      silenceMs: 900,
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
      setListening(false);
      setMouth(0);
      if (recorded === "denied" || recorded === "no-mic" || recorded === "failed") {
        noteFailure(micNote(recorded));
        return;
      }
      if (recorded === "no-speech") {
        noteFailure("No speech heard. Try again. 没听到，再说一次。");
        return;
      }
      setKicker("Transcribing");
      setHeard(langRef.current === "en" ? "Transcribing on this device…" : "正在这台设备上识别…");
      try {
        const pcm = resampleTo16k(recorded.samples, recorded.sampleRate);
        const spoken = (await transcribe(pcm, langRef.current)).trim();
        if (token !== tokenRef.current) return;
        const currentLang = langRef.current;
        const current = packs[currentLang][indexRef.current];
        const graded = gradeTranscript(currentLang, primaryText(currentLang, current), spoken);
        setMarks(graded.marks);
        setKicker("Heard");
        setHeard(spoken || (currentLang === "en" ? "(nothing heard)" : "（没听到）"));
        setScore(graded.label);
        setCatMode("idle");
      } catch {
        if (token !== tokenRef.current) return;
        noteFailure("Could not transcribe on this device. Try again. 这台设备上没识别成，再试一次。");
      }
    })();
  }, [clearTimers, noteFailure]);

  return {
    lang,
    index,
    item,
    pack,
    marks,
    catMode,
    mouth,
    kicker,
    heard,
    score,
    modelNote,
    listening,
    error: runtimeError || packError(),
    setLanguage,
    introduce: () => playIntro(langRef.current),
    jump,
    jumpTo,
    hear,
    sayIt,
    pace,
    setPace,
  };
}
