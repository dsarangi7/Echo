import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  WHISPER_EN,
  WHISPER_EOT,
  WHISPER_NO_TIMESTAMPS,
  WHISPER_PROMPT_TOKEN_CAP,
  WHISPER_SOT,
  WHISPER_START_OF_PREV,
  WHISPER_TRANSCRIBE,
  WHISPER_ZH,
  stripPromptPrefix,
  stripPromptPrefixFromOutput,
  whisperInitialPromptIds,
} from "../src/speech/whisper-prompt";

describe("Whisper initial prompt", () => {
  it("uses the vendored multilingual special tokens", () => {
    const cfg = JSON.parse(readFileSync("public/models/Xenova/whisper-tiny/tokenizer_config.json", "utf8")) as {
      added_tokens_decoder: Record<string, { content: string }>;
    };
    expect(cfg.added_tokens_decoder[String(WHISPER_START_OF_PREV)].content).toBe("<|startofprev|>");
    expect(cfg.added_tokens_decoder[String(WHISPER_SOT)].content).toBe("<|startoftranscript|>");
    expect(cfg.added_tokens_decoder[String(WHISPER_EN)].content).toBe("<|en|>");
    expect(cfg.added_tokens_decoder[String(WHISPER_ZH)].content).toBe("<|zh|>");
    expect(cfg.added_tokens_decoder[String(WHISPER_TRANSCRIBE)].content).toBe("<|transcribe|>");
    expect(cfg.added_tokens_decoder[String(WHISPER_NO_TIMESTAMPS)].content).toBe("<|notimestamps|>");
  });

  it("biases Chinese toward the target and locks the language", () => {
    const ids = whisperInitialPromptIds([120, 121, 122], "chinese");
    expect(ids).toEqual([
      WHISPER_START_OF_PREV,
      120,
      121,
      122,
      WHISPER_SOT,
      WHISPER_ZH,
      WHISPER_TRANSCRIBE,
      WHISPER_NO_TIMESTAMPS,
    ]);
    expect(ids).not.toContain(WHISPER_EN);
  });

  it("locks English the same way and drops specials from the prompt body", () => {
    const ids = whisperInitialPromptIds([WHISPER_SOT, 40, WHISPER_ZH, 41], "english");
    expect(ids?.[0]).toBe(WHISPER_START_OF_PREV);
    expect(ids).toContain(40);
    expect(ids).toContain(41);
    expect(ids).toContain(WHISPER_EN);
    expect(ids).not.toContain(WHISPER_ZH);
    expect(whisperInitialPromptIds([], "chinese")).toBeNull();
    expect(whisperInitialPromptIds([WHISPER_START_OF_PREV], "chinese")).toBeNull();
  });

  it("caps a long prompt so the decoder still has room to transcribe", () => {
    const many = Array.from({ length: 200 }, (_, i) => i + 1);
    const ids = whisperInitialPromptIds(many, "chinese");
    expect(ids).not.toBeNull();
    const body = ids!.slice(1, 1 + WHISPER_PROMPT_TOKEN_CAP);
    expect(body).toHaveLength(WHISPER_PROMPT_TOKEN_CAP);
    expect(body[0]).toBe(200 - WHISPER_PROMPT_TOKEN_CAP + 1);
    expect(ids!.at(-4)).toBe(WHISPER_SOT);
  });

  it("strips the prompt prefix and leaves a real transcript alone when the prefix was ignored", () => {
    const prefix = whisperInitialPromptIds([10, 11], "english")!;
    expect(stripPromptPrefix([...prefix, 42, 43, WHISPER_EOT], prefix)).toEqual([42, 43, WHISPER_EOT]);
    const plain = [WHISPER_SOT, WHISPER_EN, WHISPER_TRANSCRIBE, WHISPER_NO_TIMESTAMPS, 42];
    expect(stripPromptPrefix(plain, prefix)).toEqual(plain);
    expect(stripPromptPrefixFromOutput([plain, [...prefix, 7]], prefix)).toEqual([plain, [7]]);
    expect(stripPromptPrefixFromOutput({ sequences: [[...prefix, 8, 9]] }, prefix)).toEqual({ sequences: [[8, 9]] });
  });
});
