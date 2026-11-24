import pairs from "../data/t2s.json";

/**
 * Whisper often writes traditional characters (會議 for 会议) and picks a
 * homophone for a syllable the learner said correctly (才购 for 采购).
 * Chinese scoring compares sounds, so both sides are folded to simplified
 * characters and then to toneless pinyin readings before matching.
 *
 * The map is OpenCC TSCharacters (single characters only), packed as one
 * string of traditional+simplified pairs.
 */
const T2S: ReadonlyMap<string, string> = (() => {
  const map = new Map<string, string>();
  const chars = Array.from(pairs as string);
  for (let i = 0; i + 1 < chars.length; i += 2) map.set(chars[i]!, chars[i + 1]!);
  return map;
})();

export function toSimplified(text: string): string {
  let out = "";
  for (const ch of text) out += T2S.get(ch) ?? ch;
  return out;
}

/** Toneless readings for one character. Several for a polyphone (行 → xing, hang). */
export type SoundOf = (char: string) => readonly string[];

let soundOf: SoundOf | null = null;
let loading: Promise<void> | null = null;

/** Install the reading lookup. Practice loads pinyin-pro lazily and calls this. */
export function setSoundOf(fn: SoundOf | null): void {
  soundOf = fn;
  if (!fn) loading = null;
}

export function hasSoundOf(): boolean {
  return soundOf != null;
}

/** Same character, or (once readings are loaded) a shared toneless reading. */
export function sameSound(a: string, b: string): boolean {
  if (a === b) return true;
  if (!soundOf) return false;
  const left = soundOf(a);
  if (left.length === 0) return false;
  const right = soundOf(b);
  return right.some((r) => left.includes(r));
}

/** Load pinyin-pro once, on the first Chinese Say it. Failure leaves exact matching in place. */
export function loadSoundOf(): Promise<void> {
  if (soundOf) return Promise.resolve();
  loading ??= import("pinyin-pro")
    .then(({ pinyin }) => {
      const cache = new Map<string, readonly string[]>();
      setSoundOf((char) => {
        const hit = cache.get(char);
        if (hit) return hit;
        let readings: string[] = [];
        if (/\p{Script=Han}/u.test(char)) {
          readings = pinyin(char, { toneType: "none", multiple: true, type: "array" }).map((r) => r.replace(/ü/g, "v"));
        }
        cache.set(char, readings);
        return readings;
      });
    })
    .catch(() => {
      loading = null;
    });
  return loading;
}
