import type { Lang } from "../practice/types";
import { pickVoiceEn, pickVoiceZh } from "../practice/voices";
import { introClipUrl, introLine } from "./intro";

export type HearEngine = "pack" | "synthesis" | "none";

/** Why Hear it could not speak. Failure copy names that reason and does not mention the Say it model. */
export type HearFailReason = "missing" | "blocked" | "loading" | "synth";

/** What the clip itself did, before the device-voice fallback. */
export type ClipFailReason = "missing" | "blocked" | "loading" | "other";

/** How the device voice ended, when the clip did not start. */
export type SynthFailReason = "blocked" | "failed" | "unavailable";

export type ClipSnapshot = {
  errorCode: number | null;
  readyState: number;
  networkState: number;
  timedOut: boolean;
};

/**
 * Shown only after the clip and the device voice both fail.
 * These lines do not say Hear it needs the voice model, and they do not say it does not.
 * A download status for Say it can sit on screen at the same time without contradicting them.
 */
export const HEAR_FAIL_COPY: Record<HearFailReason, string> = {
  missing: "This line's sound file is missing. 这句的音频文件没有。",
  blocked: "Playback was blocked. Tap Hear it again. 播放被拦住了。再点一次「听一听」。",
  loading: "This line's audio is still loading. Tap Hear it again in a moment. 这句音频还在加载。稍后再点「听一听」。",
  synth: "The device voice could not speak this line. 这台设备的语音没把这句说出来。",
};

export function hearFailCopy(reason: HearFailReason): string {
  return HEAR_FAIL_COPY[reason];
}

const MEDIA_ERR_ABORTED = 1;
const MEDIA_ERR_NETWORK = 2;
const MEDIA_ERR_DECODE = 3;
const MEDIA_ERR_SRC_NOT_SUPPORTED = 4;
const HAVE_FUTURE_DATA = 3;
const NETWORK_LOADING = 2;
const NETWORK_NO_SOURCE = 3;

const CLIP_RANK: Record<ClipFailReason, number> = { other: 0, loading: 1, blocked: 2, missing: 3 };

function errorName(err: unknown): string {
  if (!err || typeof err !== "object" || !("name" in err)) return "";
  return typeof err.name === "string" ? err.name : "";
}

function errorMessage(err: unknown): string {
  if (typeof err === "string") return err;
  if (!err || typeof err !== "object" || !("message" in err)) return "";
  return typeof err.message === "string" ? err.message : "";
}

/** `play()` rejection: autoplay or a permission block, versus a source the browser cannot use. */
export function classifyPlayRejection(err: unknown): ClipFailReason {
  const name = errorName(err);
  if (name === "NotAllowedError" || name === "SecurityError") return "blocked";
  if (name === "NotSupportedError") return "missing";
  const message = errorMessage(err).toLowerCase();
  if (message.includes("not allowed") || message.includes("user denied permission")) return "blocked";
  if (message.includes("not supported") || message.includes("no supported source")) return "missing";
  return "other";
}

/**
 * Media element state when the clip errors or the start timer fires.
 * A missing or unreadable file is not "still loading". A download that has not
 * finished is not "missing". Abort and autoplay are not a missing file.
 */
export function classifyMediaFailure(state: ClipSnapshot): ClipFailReason {
  switch (state.errorCode) {
    case MEDIA_ERR_SRC_NOT_SUPPORTED:
    case MEDIA_ERR_DECODE:
      return "missing";
    case MEDIA_ERR_ABORTED:
      return "blocked";
    case MEDIA_ERR_NETWORK:
      return "loading";
    default:
      break;
  }
  if (state.networkState === NETWORK_NO_SOURCE && state.readyState === 0) return "missing";
  if (state.timedOut && (state.readyState < HAVE_FUTURE_DATA || state.networkState === NETWORK_LOADING)) {
    return "loading";
  }
  return "other";
}

export function classifySynthError(code: string | null | undefined, available: boolean): SynthFailReason {
  if (!available) return "unavailable";
  if (code === "not-allowed") return "blocked";
  return "failed";
}

/**
 * Prefer the clip's own reason. Device-voice failure is the message only when the
 * clip did not already fail as missing, still loading, or blocked.
 */
export function resolveHearFailure(clip: ClipFailReason, synth: SynthFailReason): HearFailReason {
  if (clip === "missing") return "missing";
  if (clip === "loading") return "loading";
  if (clip === "blocked" || synth === "blocked") return "blocked";
  return "synth";
}

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
  onUnavailable: (reason: HearFailReason) => void;
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

function clipSnapshot(audio: HTMLAudioElement, timedOut: boolean): ClipSnapshot {
  return {
    errorCode: audio.error?.code ?? null,
    readyState: audio.readyState,
    networkState: audio.networkState,
    timedOut,
  };
}

function speakWithSynthesis(lang: Lang, text: string, handlers: SpeakHandlers, token: number, clip: ClipFailReason) {
  const synth = window.speechSynthesis;
  const unavailable = () => handlers.onUnavailable(resolveHearFailure(clip, "unavailable"));
  if (!synth || typeof SpeechSynthesisUtterance === "undefined") {
    unavailable();
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
  const giveUp = (synthReason: SynthFailReason) => {
    if (token !== utteranceToken || settled) return;
    settled = true;
    window.clearTimeout(startTimer);
    clearMouth();
    handlers.onMouth(0);
    handlers.onUnavailable(resolveHearFailure(clip, synthReason));
  };
  const startTimer = window.setTimeout(() => {
    giveUp("failed");
  }, SYNTH_START_MS);
  utterance.onstart = () => {
    if (token !== utteranceToken || settled) return;
    started = true;
    window.clearTimeout(startTimer);
    handlers.onStart();
    pulse(handlers.onMouth);
  };
  utterance.onend = () => {
    if (token !== utteranceToken || settled) return;
    if (!started) {
      giveUp("failed");
      return;
    }
    settled = true;
    window.clearTimeout(startTimer);
    clearMouth();
    handlers.onMouth(0);
    handlers.onEnd();
  };
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
    giveUp(classifySynthError(reason, true));
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
  let clipFail: ClipFailReason = "other";
  const rememberClip = (reason: ClipFailReason) => {
    if (CLIP_RANK[reason] >= CLIP_RANK[clipFail]) clipFail = reason;
  };
  const stillCurrent = () => !handed && !started && token === utteranceToken;

  const startTimer = window.setTimeout(() => {
    if (!stillCurrent()) return;
    rememberClip(classifyMediaFailure(clipSnapshot(audio, true)));
    handOff();
  }, CLIP_START_MS);

  const handOff = () => {
    if (!stillCurrent()) return;
    handed = true;
    window.clearTimeout(startTimer);
    if (active === audio) active = null;
    releaseClip(audio);
    clearMouth();
    if (chooseHearEngine(false, synthesisAvailable()) === "synthesis") {
      speakWithSynthesis(lang, text, handlers, token, clipFail);
      return;
    }
    handlers.onUnavailable(resolveHearFailure(clipFail, "unavailable"));
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
  audio.onerror = () => {
    if (!stillCurrent()) return;
    rememberClip(classifyMediaFailure(clipSnapshot(audio, false)));
    handOff();
  };
  audio.src = src;
  // Chrome resets playbackRate when src is assigned. Set it after that, and again once metadata loads.
  applyPlaybackRate(audio, speakingRate);

  // play() stays in the tap turn so mobile browsers treat it as a user gesture.
  try {
    const pending = audio.play();
    void pending?.catch((err: unknown) => {
      if (!stillCurrent()) return;
      rememberClip(classifyPlayRejection(err));
      handOff();
    });
  } catch (err) {
    rememberClip(classifyPlayRejection(err));
    handOff();
  }
}

export function speakLine(lang: Lang, index: number, text: string, handlers: SpeakHandlers, rate = 1) {
  speakClip(lang, clipUrl(lang, index), text, handlers, rate);
}

export function speakIntro(lang: Lang, handlers: SpeakHandlers, rate = 1) {
  speakClip(lang, introClipUrl(lang), introLine(lang), handlers, rate);
}
