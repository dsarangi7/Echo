import type { Lang } from "../practice/types";
import { pickVoiceEn, pickVoiceZh } from "../practice/voices";
import { introClipUrl, introLine } from "./intro";

export type HearEngine = "pack" | "synthesis" | "none";

export const HEAR_FAIL =
  "Could not play this line. Hear it does not need the voice model. 这句没播出来。听一听不需要语音模型。";

const CLIP_START_MS = 8000;
const SYNTH_START_MS = 1600;

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

type InlineAudio = HTMLAudioElement & { playsInline?: boolean; webkitPreservesPitch?: boolean };

/** Device `speechSynthesis` rate at Hear it Normal. Pace multiplies this; it does not replace it. */
export const DEVICE_UTTERANCE_BASE = 0.92;

export function deviceUtteranceRate(paceRate: number): number {
  const pace = Number.isFinite(paceRate) && paceRate > 0 ? paceRate : 1;
  return DEVICE_UTTERANCE_BASE * pace;
}

/** Stretch time and keep pitch, including Safari’s prefixed flag. */
export function applyPlaybackRate(audio: InlineAudio, rate: number): void {
  const safe = Number.isFinite(rate) && rate > 0 ? rate : 1;
  audio.preservesPitch = true;
  audio.webkitPreservesPitch = true;
  audio.playbackRate = safe;
}

/** iOS Safari plays inline media, and `playback` still sounds when the ringer switch is silent. */
export function configureClipAudio(audio: InlineAudio): void {
  audio.preload = "auto";
  audio.playsInline = true;
  audio.setAttribute("playsinline", "true");
  audio.setAttribute("webkit-playsinline", "true");
  audio.volume = 1;
  audio.muted = false;
  audio.setAttribute("preload", "auto");
}

export function preferSpeakerPlayback(nav: { audioSession?: { type: string } } | undefined): void {
  if (nav?.audioSession) nav.audioSession.type = "playback";
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
let speakingRate = 1;

/** Change the clip that is already playing. The next Hear it also uses this rate. */
export function setSpeakingRate(rate: number): void {
  speakingRate = Number.isFinite(rate) && rate > 0 ? rate : 1;
  if (active) applyPlaybackRate(active, speakingRate);
}

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

function releaseClip(audio: HTMLAudioElement | null) {
  if (!audio) return;
  audio.onplaying = null;
  audio.onloadedmetadata = null;
  audio.onended = null;
  audio.onerror = null;
  audio.pause();
  audio.removeAttribute("src");
  audio.remove();
}

export function stopSpeaking() {
  utteranceToken += 1;
  const audio = active;
  active = null;
  releaseClip(audio);
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
  utterance.rate = deviceUtteranceRate(speakingRate);
  if (lang === "en") {
    utterance.lang = "en-US";
    const voice = pickVoiceEn();
    if (voice) utterance.voice = voice;
    utterance.pitch = 1.12;
  } else {
    utterance.lang = "zh-CN";
    const voice = pickVoiceZh();
    if (voice) utterance.voice = voice;
    utterance.pitch = 1.08;
  }
  let started = false;
  let retried = false;
  let settled = false;
  const startTimer = window.setTimeout(() => {
    if (token !== utteranceToken || started || settled) return;
    settled = true;
    synth.cancel();
    clearMouth();
    handlers.onMouth(0);
    handlers.onUnavailable();
  }, SYNTH_START_MS);
  const finish = (ok: boolean) => {
    if (token !== utteranceToken || settled) return;
    settled = true;
    window.clearTimeout(startTimer);
    clearMouth();
    handlers.onMouth(0);
    if (ok) handlers.onEnd();
    else handlers.onUnavailable();
  };
  utterance.onstart = () => {
    if (token !== utteranceToken || settled) return;
    started = true;
    window.clearTimeout(startTimer);
    handlers.onStart();
    pulse(handlers.onMouth);
  };
  utterance.onend = () => finish(started);
  utterance.onerror = (event) => {
    if (token !== utteranceToken || settled) return;
    const reason = event.error;
    if (!retried && !started && (reason === "interrupted" || reason === "canceled")) {
      retried = true;
      window.setTimeout(() => {
        if (token !== utteranceToken || started || settled) return;
        synth.resume();
        synth.speak(utterance);
      }, 80);
      return;
    }
    finish(false);
  };
  synth.cancel();
  synth.resume();
  synth.speak(utterance);
}

/** Pack clip, or any other same-origin MP3, then the device voice with `text` if the clip cannot start. */
export function speakClip(lang: Lang, src: string, text: string, handlers: SpeakHandlers, rate = 1) {
  stopSpeaking();
  speakingRate = Number.isFinite(rate) && rate > 0 ? rate : 1;
  const token = utteranceToken;
  preferSpeakerPlayback(
    typeof navigator === "undefined" ? undefined : (navigator as { audioSession?: { type: string } }),
  );
  const audio = document.createElement("audio");
  configureClipAudio(audio);
  audio.setAttribute("aria-hidden", "true");
  // Keep it in the document without display:none. iOS skips playback for hidden media.
  audio.style.cssText = "position:fixed;width:0;height:0;opacity:0;pointer-events:none;";
  document.body.appendChild(audio);
  active = audio;

  let started = false;
  let handed = false;
  const startTimer = window.setTimeout(() => {
    if (!started) handOff();
  }, CLIP_START_MS);

  const handOff = () => {
    if (handed || started || token !== utteranceToken) return;
    handed = true;
    window.clearTimeout(startTimer);
    if (active === audio) active = null;
    releaseClip(audio);
    clearMouth();
    if (chooseHearEngine(false, synthesisAvailable()) === "synthesis") {
      speakWithSynthesis(lang, text, handlers, token);
      return;
    }
    handlers.onUnavailable();
  };

  const keepRate = () => {
    if (token !== utteranceToken || handed) return;
    applyPlaybackRate(audio, speakingRate);
  };
  audio.onloadedmetadata = keepRate;
  audio.onplaying = () => {
    if (token !== utteranceToken || handed) return;
    started = true;
    window.clearTimeout(startTimer);
    keepRate();
    handlers.onStart();
    pulse(handlers.onMouth);
  };
  audio.onended = () => {
    if (token !== utteranceToken || handed || active !== audio) return;
    active = null;
    releaseClip(audio);
    clearMouth();
    handlers.onMouth(0);
    handlers.onEnd();
  };
  audio.onerror = () => handOff();
  audio.src = src;
  // Chrome resets playbackRate when src is assigned. Set it after that, and again once metadata loads.
  applyPlaybackRate(audio, speakingRate);

  // play() stays in the tap turn so mobile browsers treat it as a user gesture.
  try {
    const pending = audio.play();
    void pending?.catch(() => handOff());
  } catch {
    handOff();
  }
}

export function speakLine(lang: Lang, index: number, text: string, handlers: SpeakHandlers, rate = 1) {
  speakClip(lang, clipUrl(lang, index), text, handlers, rate);
}

export function speakIntro(lang: Lang, handlers: SpeakHandlers, rate = 1) {
  speakClip(lang, introClipUrl(lang), introLine(lang), handlers, rate);
}
