import { useCallback, useEffect, useRef, useState } from "react";
import { packError, packs } from "./packs";
import { gradeTranscript } from "./score";
import { loadIndexes, loadLang, saveIndexes, saveLang } from "./storage";
import type { CatMode, Lang, Sentence } from "./types";
import { pickVoiceEn, pickVoiceZh } from "./voices";

const PROMPT_EN = "Tap Hear it, then Say it. 先听一听，再说一说。";
const PROMPT_ZH = "点「听一听」，再点「说一说」。 Hear it, then say it.";

function recognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

function primaryText(lang: Lang, item: Sentence): string {
  return lang === "en" ? item.en : item.zh;
}

export function usePractice() {
  const [lang, setLang] = useState<Lang>(loadLang);
  const [indexes, setIndexes] = useState(loadIndexes);
  const [marks, setMarks] = useState<boolean[] | null>(null);
  const [catMode, setCatMode] = useState<CatMode>("idle");
  const [mouth, setMouth] = useState(0);
  const [kicker, setKicker] = useState("Practice");
  const [heard, setHeard] = useState(() => (loadLang() === "en" ? PROMPT_EN : PROMPT_ZH));
  const [score, setScore] = useState("");
  const [showChromeNote, setShowChromeNote] = useState(() => recognitionCtor() === null);
  const [runtimeError, setRuntimeError] = useState("");

  const tokenRef = useRef(0);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const modeRef = useRef<CatMode>("idle");
  const langRef = useRef<Lang>(lang);
  const indexRef = useRef(0);
  const timersRef = useRef<number[]>([]);

  const pack = packs[lang];
  const index = Math.min(indexes[lang], pack.length - 1);
  const item = pack[index];
  langRef.current = lang;
  indexRef.current = index;
  modeRef.current = catMode;

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((id) => {
      window.clearTimeout(id);
      window.clearInterval(id);
    });
    timersRef.current = [];
  }, []);

  const remember = useCallback((id: number) => {
    timersRef.current.push(id);
  }, []);

  const resetPractice = useCallback(() => {
    setMarks(null);
    setKicker("Practice");
    setScore("");
    setHeard(langRef.current === "en" ? PROMPT_EN : PROMPT_ZH);
  }, []);

  const stopAudio = useCallback(() => {
    tokenRef.current += 1;
    window.speechSynthesis?.cancel();
    const rec = recRef.current;
    recRef.current = null;
    if (rec) {
      rec.onend = null;
      rec.onerror = null;
      rec.onresult = null;
      try {
        rec.abort();
      } catch {
        /* already stopped */
      }
    }
    clearTimers();
    setMouth(0);
    setCatMode("idle");
  }, [clearTimers]);

  useEffect(() => {
    saveIndexes(indexes);
  }, [indexes]);

  useEffect(() => {
    document.title = lang === "en" ? "课猫 Echo · English practice" : "课猫 Echo · 中文口语练习";
    document.documentElement.lang = lang === "en" ? "en" : "zh-CN";
  }, [lang]);

  useEffect(() => {
    window.speechSynthesis?.getVoices();
    const onError = (event: ErrorEvent) => setRuntimeError(event.message || "error");
    window.addEventListener("error", onError);
    return () => window.removeEventListener("error", onError);
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
      stopAudio();
      langRef.current = next;
      setLang(next);
      saveLang(next);
      resetPractice();
    },
    [resetPractice, stopAudio],
  );

  const hear = useCallback(() => {
    const synth = window.speechSynthesis;
    if (!synth) {
      setKicker("Note");
      setHeard("This browser cannot play speech. 这个浏览器不能朗读。");
      setScore("");
      return;
    }
    if (recRef.current) {
      try {
        recRef.current.onend = null;
        recRef.current.abort();
      } catch {
        /* ignore */
      }
      recRef.current = null;
    }
    const token = ++tokenRef.current;
    clearTimers();
    const line = primaryText(langRef.current, packs[langRef.current][indexRef.current]);
    synth.cancel();
    const startId = window.setTimeout(() => {
      if (token !== tokenRef.current) return;
      const utterance = new SpeechSynthesisUtterance(line);
      const speaking = langRef.current;
      if (speaking === "en") {
        utterance.lang = "en-US";
        const voice = pickVoiceEn();
        if (voice) utterance.voice = voice;
        utterance.rate = 0.92;
        utterance.pitch = 1.12;
      } else {
        utterance.lang = "zh-CN";
        const voice = pickVoiceZh();
        if (voice) utterance.voice = voice;
        utterance.rate = 0.92;
        utterance.pitch = 1.08;
      }

      let sawBoundary = false;
      utterance.onboundary = () => {
        if (token !== tokenRef.current) return;
        sawBoundary = true;
        setMouth(1);
        const closeId = window.setTimeout(() => {
          if (token === tokenRef.current) setMouth(0.12);
        }, 110);
        remember(closeId);
      };
      utterance.onstart = () => {
        if (token !== tokenRef.current) return;
        setCatMode("talk");
        const fallbackId = window.setTimeout(() => {
          if (token !== tokenRef.current || sawBoundary) return;
          const pulse = window.setInterval(() => {
            setMouth((open) => (open > 0.5 ? 0.12 : 1));
          }, 160);
          remember(pulse);
        }, 320);
        remember(fallbackId);
      };
      const finish = () => {
        if (token !== tokenRef.current) return;
        clearTimers();
        setMouth(0);
        setCatMode("idle");
      };
      utterance.onend = finish;
      utterance.onerror = finish;
      synth.speak(utterance);
    }, 80);
    remember(startId);
  }, [clearTimers, remember]);

  const sayIt = useCallback(() => {
    const Ctor = recognitionCtor();
    if (!Ctor) {
      setShowChromeNote(true);
      return;
    }
    if (modeRef.current === "listen" && recRef.current) {
      try {
        recRef.current.abort();
      } catch {
        /* ignore */
      }
      return;
    }
    tokenRef.current += 1;
    window.speechSynthesis?.cancel();
    clearTimers();
    setMouth(0);
    setCatMode("listen");
    const rec = new Ctor();
    recRef.current = rec;
    rec.lang = langRef.current === "en" ? "en-US" : "zh-CN";
    rec.interimResults = false;
    rec.continuous = false;
    rec.maxAlternatives = 1;
    rec.onstart = () => setCatMode("listen");
    rec.onresult = (event) => {
      let text = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        text += event.results[i][0].transcript;
      }
      const spoken = text.trim();
      const currentLang = langRef.current;
      const current = packs[currentLang][indexRef.current];
      const graded = gradeTranscript(currentLang, primaryText(currentLang, current), spoken);
      setMarks(graded.marks);
      setKicker("Heard");
      setHeard(spoken || (currentLang === "en" ? "(nothing heard)" : "（没听到）"));
      setScore(graded.label);
    };
    rec.onerror = (event) => {
      if (!event || event.error === "aborted") return;
      setKicker("Note");
      setScore("");
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setHeard("Microphone is blocked. Allow the mic in Chrome, then try again. 麦克风被拦住了，请在 Chrome 里允许。");
      } else if (event.error === "no-speech") {
        setHeard("No speech heard. Try again. 没听到，再说一次。");
      } else if (event.error === "network") {
        setHeard("Chrome could not reach its speech service. Check the network and try again. 语音服务连不上，请检查网络。");
      } else {
        setHeard("Could not hear that. Try again. 没听成，再试一次。");
      }
    };
    rec.onend = () => {
      if (modeRef.current === "listen") setCatMode("idle");
      if (recRef.current === rec) recRef.current = null;
    };
    try {
      rec.start();
    } catch {
      setCatMode("idle");
      setKicker("Note");
      setHeard("Could not start listening. Try again. 听写没开始，再试一次。");
      setScore("");
    }
  }, [clearTimers]);

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
    showChromeNote,
    error: runtimeError || packError(),
    setLanguage,
    jump,
    jumpTo,
    hear,
    sayIt,
  };
}
