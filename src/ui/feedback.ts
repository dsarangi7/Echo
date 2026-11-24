import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { readPrefs } from "./prefs";

/**
 * Touch and sound that make the paper feel physical: a stamp thud, a soft
 * paper flip, a light tick. All synthesized with Web Audio (no extra files),
 * all skipped when Settings → Sounds & vibration is off.
 */
export type Buzz = "tick" | "stamp" | "soft";

function native(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

export function buzz(kind: Buzz): void {
  if (!readPrefs().feedback) return;
  try {
    if (native()) {
      const style = kind === "stamp" ? ImpactStyle.Heavy : kind === "soft" ? ImpactStyle.Medium : ImpactStyle.Light;
      void Haptics.impact({ style }).catch(() => undefined);
      return;
    }
    const pattern = kind === "stamp" ? [18, 40, 28] : kind === "soft" ? 14 : 8;
    navigator.vibrate?.(pattern);
  } catch {
    /* No vibrator. */
  }
}

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  try {
    if (!ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function noiseBuffer(ac: AudioContext, seconds: number): AudioBuffer {
  const buffer = ac.createBuffer(1, Math.max(1, Math.floor(ac.sampleRate * seconds)), ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  return buffer;
}

/** A seal pressed onto paper: low thump plus a short papery crush. */
export function stampSound(): void {
  if (!readPrefs().feedback) return;
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime + 0.01;
  const thump = ac.createOscillator();
  const gain = ac.createGain();
  thump.type = "sine";
  thump.frequency.setValueAtTime(150, t);
  thump.frequency.exponentialRampToValueAtTime(48, t + 0.16);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.55, t + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
  thump.connect(gain).connect(ac.destination);
  thump.start(t);
  thump.stop(t + 0.25);

  const crush = ac.createBufferSource();
  crush.buffer = noiseBuffer(ac, 0.09);
  const band = ac.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.value = 1400;
  band.Q.value = 0.8;
  const g2 = ac.createGain();
  g2.gain.value = 0.18;
  crush.connect(band).connect(g2).connect(ac.destination);
  crush.start(t);
}

/** The next card sliding over paper. Very quiet. */
export function flipSound(): void {
  if (!readPrefs().feedback) return;
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime + 0.005;
  const src = ac.createBufferSource();
  src.buffer = noiseBuffer(ac, 0.12);
  const hp = ac.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 2600;
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.06, t + 0.03);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
  src.connect(hp).connect(g).connect(ac.destination);
  src.start(t);
}
