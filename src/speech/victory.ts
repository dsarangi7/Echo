import { configureClipAudio, preferSpeakerPlayback } from "./tts";

/** Short original chime. Served with the rest of the public files, including the Android shell. */
export function victoryClipUrl(base = import.meta.env.BASE_URL): string {
  const root = base.endsWith("/") ? base : `${base}/`;
  return `${root}assets/victory.wav`;
}

type VictoryAudio = HTMLAudioElement;

function defaultAudio(src: string): VictoryAudio | null {
  if (typeof Audio === "undefined") return null;
  return new Audio(src);
}

/**
 * Play the clear-match chime once. Hear it uses the same inline audio setup,
 * including a playback session so a silent ringer can still sound.
 * A missing Audio constructor or a rejected play() is ignored.
 */
export function playVictory(create: (src: string) => VictoryAudio | null = defaultAudio): void {
  try {
    const audio = create(victoryClipUrl());
    if (!audio) return;
    configureClipAudio(audio);
    preferSpeakerPlayback(
      typeof navigator === "undefined" ? undefined : (navigator as { audioSession?: { type: string } }),
    );
    const pending = audio.play();
    void pending?.catch(() => undefined);
  } catch {
    /* Autoplay, a missing decoder, or no audio device. The score still stands. */
  }
}

/**
 * Encouragement after a line that was not clear, spoken in the learner's *other* language:
 * people learning English hear 中文 (没关系，我们再试一次。), people learning Chinese hear English
 * (Good try! Let's try again.). Piper clips, same voices as the packs.
 */
export function encourageClipUrl(learning: "en" | "zh", base = import.meta.env.BASE_URL): string {
  const root = base.endsWith("/") ? base : `${base}/`;
  return `${root}audio/encourage/${learning === "en" ? "zh" : "en"}.mp3`;
}

export function playEncourage(learning: "en" | "zh", create: (src: string) => VictoryAudio | null = defaultAudio): void {
  try {
    const audio = create(encourageClipUrl(learning));
    if (!audio) return;
    configureClipAudio(audio);
    const pending = audio.play();
    void pending?.catch(() => undefined);
  } catch {
    /* No audio. The card and the cat still say it. */
  }
}
