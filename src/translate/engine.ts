import type { Lang } from "../practice/types";

/**
 * Free public machine translation. The browser calls MyMemory directly so GitHub Pages
 * and Vercel both work without a key or a serverless route.
 * Anonymous quota is about 5,000 characters per day per IP.
 * https://mymemory.translated.net/doc/spec.php
 */
export const TRANSLATE_ENGINE = "MyMemory";
export const TRANSLATE_ENDPOINT = "https://api.mymemory.translated.net/get";
export const TRANSLATE_MAX_CHARS = 500;

export type DirectionChoice = "auto" | "en-zh" | "zh-en";

export type TranslateFailure = "network" | "quota" | "rate" | "length" | "empty" | "unavailable";

export const TRANSLATE_FAIL_COPY: Record<TranslateFailure, string> = {
  empty: "Nothing to translate yet. Type or speak a sentence. 还没有内容。打一句，或者说一句。",
  length: "That line is too long. Keep it under 500 characters. 这句太长了。请控制在 500 字以内。",
  network: "Could not reach the translator. Check the network and try again. 连不上翻译。请检查网络后再试。",
  quota: "Today's free translation quota is used up. Try again tomorrow. 今天的免费翻译额度用完了。明天再试。",
  rate: "The translator is busy. Wait a moment, then try again. 翻译这会儿太忙。等一下再试。",
  unavailable: "Translation did not come back. Try again in a moment. 没有返回译文。过一会儿再试。",
};

export const LISTENING_NOTE = "Listening… tap Speak again to finish. 在听…再点一次「说一句」。";
export const TRANSCRIBING_NOTE = "Transcribing on this device… 正在这台设备上识别…";
export const TRANSLATING_NOTE = "Translating… 正在翻译…";
export const NO_SPEECH_NOTE = "No speech heard. Try again. 没听到，再说一次。";
export const STT_FAIL_NOTE = "Could not transcribe that. Type the sentence instead. 没识别出来。可以直接打字。";
export const COPIED_NOTE = "Copied. 已复制。";
export const COPY_FAIL_NOTE = "Could not copy from this browser. Select the translation and copy it. 这个浏览器没复制上。请选中译文再复制。";

const CJK = /[\u3400-\u9fff\uf900-\ufaff]/g;
const LATIN = /[A-Za-z]/g;

export type Script = "empty" | "en" | "zh";

export function scriptOf(text: string): Script {
  const trimmed = text.trim();
  if (!trimmed) return "empty";
  const cjk = trimmed.match(CJK)?.length ?? 0;
  const latin = trimmed.match(LATIN)?.length ?? 0;
  if (cjk === 0 && latin === 0) return "empty";
  if (cjk === 0) return "en";
  if (latin === 0) return "zh";
  return cjk >= latin ? "zh" : "en";
}

export function resolvePair(
  text: string,
  choice: DirectionChoice,
): { source: Lang; target: Lang; detected: boolean } {
  if (choice === "en-zh") return { source: "en", target: "zh", detected: false };
  if (choice === "zh-en") return { source: "zh", target: "en", detected: false };
  const script = scriptOf(text);
  if (script === "zh") return { source: "zh", target: "en", detected: true };
  if (script === "en") return { source: "en", target: "zh", detected: true };
  return { source: "en", target: "zh", detected: false };
}

export function pairLabel(source: Lang): string {
  return source === "en" ? "English → 中文" : "中文 → English";
}

/** Shown when a locked direction disagrees with an obvious script. Auto does not nag. */
export function directionHint(text: string, choice: DirectionChoice): string | null {
  if (choice === "auto") return null;
  const script = scriptOf(text);
  if (script === "empty") return null;
  const source = choice === "en-zh" ? "en" : "zh";
  if (script === "zh" && source !== "zh") {
    return "This looks like 中文. Swap if you want Chinese → English. 这句像是中文。要对成英语就点对调。";
  }
  if (script === "en" && source !== "en") {
    return "This looks like English. Swap if you want English → 中文. 这句像是英语。要对成中文就点对调。";
  }
  return null;
}

export function readContact(env: string | undefined = import.meta.env.VITE_MYMEMORY_CONTACT): string | undefined {
  if (typeof env !== "string") return undefined;
  const trimmed = env.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return undefined;
  return trimmed;
}

export function langPair(source: Lang, target: Lang): string {
  const code = (lang: Lang) => (lang === "zh" ? "zh-CN" : "en");
  return `${code(source)}|${code(target)}`;
}

export function myMemoryUrl(text: string, source: Lang, target: Lang, contact?: string): string {
  const url = new URL(TRANSLATE_ENDPOINT);
  url.searchParams.set("q", text);
  url.searchParams.set("langpair", langPair(source, target));
  if (contact) url.searchParams.set("de", contact);
  return url.toString();
}

const NAMED_ENTITIES: Record<string, string> = {
  quot: '"',
  apos: "'",
  lt: "<",
  gt: ">",
  amp: "&",
  nbsp: " ",
};

function fromCode(code: number): string {
  if (!Number.isInteger(code) || code < 0 || code > 0x10ffff) return "";
  try {
    return String.fromCodePoint(code);
  } catch {
    return "";
  }
}

/** MyMemory sometimes returns numeric HTML entities inside an otherwise plain string. */
export function decodeMtText(value: string): string {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => fromCode(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => fromCode(Number(dec)))
    .replace(/&([a-z]+);/gi, (all, name: string) => NAMED_ENTITIES[name.toLowerCase()] ?? all)
    .trim();
}

type MyMemoryBody = {
  responseData?: { translatedText?: unknown };
  responseDetails?: unknown;
  responseStatus?: unknown;
  quotaFinished?: unknown;
};

function asBody(body: unknown): MyMemoryBody | null {
  if (!body || typeof body !== "object") return null;
  return body as MyMemoryBody;
}

function warningText(body: MyMemoryBody | null): string {
  if (!body) return "";
  const translated = body.responseData?.translatedText;
  const parts = [typeof translated === "string" ? translated : "", typeof body.responseDetails === "string" ? body.responseDetails : ""];
  return parts.join(" ").toUpperCase();
}

function isQuota(warning: string, quotaFinished: unknown): boolean {
  if (quotaFinished === true) return true;
  return warning.includes("USED ALL AVAILABLE") || warning.includes("QUOTA") || warning.includes("DAILY LIMIT");
}

function isLength(warning: string): boolean {
  return warning.includes("QUERY LENGTH") || warning.includes("MAX ALLOWED QUERY");
}

function isRate(warning: string): boolean {
  return warning.includes("TOO MANY REQUESTS") || warning.includes("RATE LIMIT");
}

function retrySeconds(value: string | null): number | null {
  if (!value) return null;
  const seconds = Number(value);
  return Number.isFinite(seconds) ? seconds : null;
}

export function classifyMyMemory(
  status: number,
  body: unknown,
  retryAfter: string | null = null,
): { ok: true; text: string } | { ok: false; failure: TranslateFailure } {
  const record = asBody(body);
  const warning = warningText(record);
  if (isLength(warning)) return { ok: false, failure: "length" };
  const quota = isQuota(warning, record?.quotaFinished);
  const waited = retrySeconds(retryAfter);
  if (status === 429 || record?.responseStatus === 429 || isRate(warning)) {
    if (quota || (waited != null && waited >= 3600)) return { ok: false, failure: "quota" };
    return { ok: false, failure: "rate" };
  }
  if (quota) return { ok: false, failure: "quota" };
  if (!record) return { ok: false, failure: "unavailable" };

  const responseStatus = typeof record.responseStatus === "number" ? record.responseStatus : status;
  if (status >= 400 || (responseStatus !== 200 && responseStatus !== 0)) {
    return { ok: false, failure: "unavailable" };
  }

  const raw = record.responseData?.translatedText;
  if (typeof raw !== "string") return { ok: false, failure: "unavailable" };
  const text = decodeMtText(raw);
  if (!text || /^MYMEMORY WARNING\b/i.test(text)) return { ok: false, failure: "unavailable" };
  return { ok: true, text };
}

export type TranslateOutcome = {
  ok: boolean;
  text: string;
  source: Lang;
  target: Lang;
  detected: boolean;
  failure: TranslateFailure | null;
};

export async function translateSentence(
  text: string,
  choice: DirectionChoice,
  fetchImpl: typeof fetch = globalThis.fetch,
  contact = readContact(),
): Promise<TranslateOutcome> {
  const pair = resolvePair(text, choice);
  const base = { source: pair.source, target: pair.target, detected: pair.detected, text: "" };
  const trimmed = text.trim();
  if (!trimmed) return { ...base, ok: false, failure: "empty" };
  if (trimmed.length > TRANSLATE_MAX_CHARS) return { ...base, ok: false, failure: "length" };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetchImpl(myMemoryUrl(trimmed, pair.source, pair.target, contact), {
      method: "GET",
      headers: { Accept: "application/json" },
      credentials: "omit",
      cache: "no-store",
      signal: controller.signal,
    });
    let body: unknown = null;
    try {
      body = await response.json();
    } catch {
      body = null;
    }
    const parsed = classifyMyMemory(response.status, body, response.headers.get("retry-after"));
    if (!parsed.ok) return { ...base, ok: false, failure: parsed.failure };
    return { ...base, ok: true, failure: null, text: parsed.text };
  } catch {
    return { ...base, ok: false, failure: "network" };
  } finally {
    clearTimeout(timer);
  }
}
