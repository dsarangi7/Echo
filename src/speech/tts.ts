import type { Lang } from "../practice/types";
import { pickVoiceEn, pickVoiceZh } from "../practice/voices";

export type HearEngine = "pack" | "synthesis" | "none";

/** Hypothesis H4: bundled Piper clips first, device speechSynthesis only if the clip cannot play. */
export function chooseHearEngine(clipOk: boolean, synthOk: boolean): HearEngine {
  if (clipOk) return "pack";
  if (synthOk) return "synthesis";
  return "none";
}

export function clipUrl(lang: Lang, index: number, base = import.meta.env.BASE_URL): string {
  const root = base.endsWith("/") ? base : `${base}/`;
  return `${root}audio/${lang}/${String(index).padStart(3, "0")}.mp3`;
}

export function synthesisAvailable(): boolean {
  return typeof window !== "undefined" && typeof window.speechSynthesis !== "undefined" && typeof SpeechSynthesisUtterance !== "undefined";
}

type SpeakHandlers = {
  onStart: () => void;
  onMouth: (open: number) => void;
  onEnd: () => void;
  onUnavailable: () => void;
};

let active: HTMLAudioElement | null = null;
let mouthTimer = 0;
let utteranceToken = 0;

function clearMouth() {
  window.clearInterval(mouthTimer);
  mouthTimer = 0;
}

function pulse(onMouth: (open: number) => void) {
  clearMouth();
  mouthTimer = window.setInterval(() => {
    onMouth(Math.random() > 0.45 ? 1 : 0.12);
  }, 160);
}

export function stopSpeaking() {
  utteranceToken += 1;
  if (active) {
    active.onended = null;
    active.onerror = null;
    active.pause();
    active.removeAttribute("src");
    active.load();
    active = null;
  }
  clearMouth();
  window.speechSynthesis?.cancel();
}

function speakWithSynthesis(lang: Lang, text: string, handlers: SpeakHandlers, token: number) {
  const synth = window.speechSynthesis;
  if (!synth || typeof SpeechSynthesisUtterance === "undefined") {
    handlers.onUnavailable();
    return;
  }
  const utterance = new SpeechSynthesisUtterance(text);
  if (lang === "en") {
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
  let started = false;
  utterance.onstart = () => {
    if (token !== utteranceToken) return;
    started = true;
    handlers.onStart();
    pulse(handlers.onMouth);
  };
  const finish = () => {
    if (token !== utteranceToken) return;
    clearMouth();
    handlers.onMouth(0);
    if (!started) handlers.onUnavailable();
    else handlers.onEnd();
  };
  utterance.onend = finish;
  utterance.onerror = finish;
  synth.cancel();
  window.setTimeout(() => {
    if (token !== utteranceToken) return;
    synth.speak(utterance);
  }, 80);
}

export function speakLine(lang: Lang, index: number, text: string, handlers: SpeakHandlers) {
  stopSpeaking();
  const token = utteranceToken;
  const audio = new Audio(clipUrl(lang, index));
  active = audio;
  let handed = false;
  let started = false;
  const handOff = () => {
    if (handed || started || token !== utteranceToken) return;
    handed = true;
    if (active === audio) active = null;
    clearMouth();
    if (chooseHearEngine(false, synthesisAvailable()) === "synthesis") {
      speakWithSynthesis(lang, text, handlers, token);
      return;
    }
    handlers.onUnavailable();
  };
  audio.onplaying = () => {
    if (token !== utteranceToken) return;
    started = true;
    handlers.onStart();
    pulse(handlers.onMouth);
  };
  audio.onended = () => {
    if (token !== utteranceToken || active !== audio) return;
    active = null;
    clearMouth();
    handlers.onMouth(0);
    handlers.onEnd();
  };
  audio.onerror = handOff;
  void audio.play().catch(handOff);
}
