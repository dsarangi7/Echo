/**
 * Whisper tiny initial-prompt bias for Transformers.js 2.17.
 *
 * This build has no `prompt_ids` / `initial_prompt` argument (that API is still
 * unmerged upstream). The worker passes the target line as a `<|startofprev|>`
 * decoder prefix, then strips that prefix before decode. The prefix is context,
 * not forced transcript tokens, so a wrong recording cannot become a perfect score.
 *
 * Token ids are the multilingual Whisper specials vendored with this site.
 */

export const WHISPER_EOT = 50257;
export const WHISPER_SOT = 50258;
export const WHISPER_EN = 50259;
export const WHISPER_ZH = 50260;
export const WHISPER_TRANSCRIBE = 50359;
export const WHISPER_START_OF_PREV = 50361;
export const WHISPER_NO_TIMESTAMPS = 50363;

/** Leave the 448-token decoder room to transcribe after the prompt. */
export const WHISPER_PROMPT_TOKEN_CAP = 80;

const LANG_ID = {
  english: WHISPER_EN,
  chinese: WHISPER_ZH,
} as const;

export type WhisperPromptLanguage = keyof typeof LANG_ID;

/**
 * Decoder prefix: `<|startofprev|>` + target tokens + `<|startoftranscript|>` + language + transcribe + notimestamps.
 * Returns null when there is nothing to bias toward.
 */
export function whisperInitialPromptIds(
  promptTokenIds: readonly number[],
  language: WhisperPromptLanguage,
): number[] | null {
  const body = promptTokenIds.filter((id) => Number.isInteger(id) && id >= 0 && id < WHISPER_EOT).slice(-WHISPER_PROMPT_TOKEN_CAP);
  if (body.length === 0) return null;
  return [WHISPER_START_OF_PREV, ...body, WHISPER_SOT, LANG_ID[language], WHISPER_TRANSCRIBE, WHISPER_NO_TIMESTAMPS];
}

export function stripPromptPrefix(sequence: readonly number[], prefix: readonly number[]): number[] {
  if (prefix.length === 0 || sequence.length < prefix.length) return [...sequence];
  for (let i = 0; i < prefix.length; i++) {
    if (sequence[i] !== prefix[i]) return [...sequence];
  }
  return sequence.slice(prefix.length);
}

/** Drop a prompt prefix only when generation actually started with it. */
export function stripPromptPrefixFromOutput(produced: unknown, prefix: readonly number[]): unknown {
  if (prefix.length === 0) return produced;
  if (Array.isArray(produced) && produced.every((row) => Array.isArray(row))) {
    return (produced as number[][]).map((seq) => stripPromptPrefix(seq, prefix));
  }
  if (produced && typeof produced === "object" && "sequences" in produced) {
    const sequences = (produced as { sequences: unknown }).sequences;
    if (Array.isArray(sequences) && sequences.every((row) => Array.isArray(row))) {
      return {
        ...produced,
        sequences: (sequences as number[][]).map((seq) => stripPromptPrefix(seq, prefix)),
      };
    }
  }
  return produced;
}
