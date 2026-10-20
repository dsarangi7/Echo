import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ModeNav } from "../src/components/ModeNav";
import { TranslatePanel } from "../src/components/TranslatePanel";
import {
  COPY_FAIL_NOTE,
  TRANSLATE_ENDPOINT,
  TRANSLATE_ENGINE,
  TRANSLATE_FAIL_COPY,
  TRANSLATE_MAX_CHARS,
  classifyMyMemory,
  decodeMtText,
  directionHint,
  langPair,
  myMemoryUrl,
  pairLabel,
  readContact,
  resolvePair,
  scriptOf,
  translateSentence,
} from "../src/translate/engine";

function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...headers } });
}

describe("translation direction", () => {
  it("detects Chinese, English, and an empty line", () => {
    expect(scriptOf("")).toBe("empty");
    expect(scriptOf("   ")).toBe("empty");
    expect(scriptOf("123")).toBe("empty");
    expect(scriptOf("Please send the invoice tomorrow.")).toBe("en");
    expect(scriptOf("请把发票明天发过来。")).toBe("zh");
    expect(scriptOf("请把发票发到 email")).toBe("zh");
    expect(scriptOf("Invoice 发票")).toBe("en");
  });

  it("auto-detects a pair and still honors a locked direction", () => {
    expect(resolvePair("请把发票明天发过来。", "auto")).toEqual({ source: "zh", target: "en", detected: true });
    expect(resolvePair("Please send the invoice.", "auto")).toEqual({ source: "en", target: "zh", detected: true });
    expect(resolvePair("", "auto")).toEqual({ source: "en", target: "zh", detected: false });
    expect(resolvePair("请把发票明天发过来。", "en-zh")).toEqual({ source: "en", target: "zh", detected: false });
    expect(pairLabel("en")).toBe("English → 中文");
    expect(pairLabel("zh")).toBe("中文 → English");
    expect(directionHint("请发发票", "en-zh")).toContain("这句像是中文");
    expect(directionHint("Please send it", "zh-en")).toContain("这句像是英语");
    expect(directionHint("请发发票", "auto")).toBeNull();
    expect(directionHint("Please send it", "en-zh")).toBeNull();
  });
});

describe("MyMemory", () => {
  it("names the public endpoint and builds a Simplified Chinese pair", () => {
    expect(TRANSLATE_ENGINE).toBe("MyMemory");
    expect(TRANSLATE_ENDPOINT).toBe("https://api.mymemory.translated.net/get");
    expect(langPair("en", "zh")).toBe("en|zh-CN");
    expect(langPair("zh", "en")).toBe("zh-CN|en");
    const url = new URL(myMemoryUrl("请发发票", "zh", "en", "desk@example.com"));
    expect(url.origin + url.pathname).toBe("https://api.mymemory.translated.net/get");
    expect(url.searchParams.get("q")).toBe("请发发票");
    expect(url.searchParams.get("langpair")).toBe("zh-CN|en");
    expect(url.searchParams.get("de")).toBe("desk@example.com");
    expect(myMemoryUrl("Hello", "en", "zh")).not.toContain("de=");
  });

  it("keeps the optional contact as an email and ignores anything else", () => {
    expect(readContact("")).toBeUndefined();
    expect(readContact("not-a-key")).toBeUndefined();
    expect(readContact(" desk@example.com ")).toBe("desk@example.com");
  });

  it("decodes entities and refuses quota, rate, and length replies", () => {
    expect(decodeMtText("It&#39;s &quot;ready&quot; &amp; waiting")).toBe("It's \"ready\" & waiting");
    expect(
      classifyMyMemory(200, {
        responseStatus: 200,
        quotaFinished: false,
        responseData: { translatedText: "请明天发送发票。" },
      }),
    ).toEqual({ ok: true, text: "请明天发送发票。" });
    expect(
      classifyMyMemory(200, {
        responseStatus: 200,
        quotaFinished: true,
        responseData: { translatedText: "MYMEMORY WARNING: YOU USED ALL AVAILABLE FREE TRANSLATIONS FOR TODAY" },
      }),
    ).toEqual({ ok: false, failure: "quota" });
    expect(classifyMyMemory(429, { responseStatus: 429, responseData: { translatedText: "" } }, "20")).toEqual({
      ok: false,
      failure: "rate",
    });
    expect(classifyMyMemory(429, { quotaFinished: false, responseData: { translatedText: "" } }, "72000")).toEqual({
      ok: false,
      failure: "quota",
    });
    expect(
      classifyMyMemory(403, {
        responseStatus: 403,
        responseDetails: "QUERY LENGTH LIMIT EXCEEDED. MAX ALLOWED QUERY : 500 CHARS",
        responseData: { translatedText: "" },
      }),
    ).toEqual({ ok: false, failure: "length" });
    expect(classifyMyMemory(500, null)).toEqual({ ok: false, failure: "unavailable" });
    expect(classifyMyMemory(200, { responseStatus: 200, responseData: { translatedText: "   " } })).toEqual({
      ok: false,
      failure: "unavailable",
    });
  });

  it("translates through an injected fetch and does not call it for an empty line", async () => {
    let calls = 0;
    const fetchImpl: typeof fetch = async (input) => {
      calls += 1;
      const url = new URL(String(input));
      expect(url.searchParams.get("langpair")).toBe("en|zh-CN");
      return jsonResponse({
        responseStatus: 200,
        quotaFinished: false,
        responseData: { translatedText: "请明天发送发票。" },
      });
    };
    const done = await translateSentence("Please send the invoice tomorrow.", "auto", fetchImpl, undefined);
    expect(calls).toBe(1);
    expect(done).toMatchObject({ ok: true, text: "请明天发送发票。", source: "en", target: "zh", detected: true });

    const empty = await translateSentence("  ", "auto", fetchImpl, undefined);
    expect(calls).toBe(1);
    expect(empty.ok).toBe(false);
    expect(empty.failure).toBe("empty");

    const offline = await translateSentence("Hello", "en-zh", async () => {
      throw new Error("offline");
    });
    expect(offline.failure).toBe("network");
    expect(TRANSLATE_FAIL_COPY.network).toContain("连不上翻译");
    expect(TRANSLATE_FAIL_COPY.quota).toContain("额度用完了");
    expect(TRANSLATE_FAIL_COPY.rate).toContain("太忙");
  });
});

describe("Translate screen", () => {
  const props = {
    choice: "auto" as const,
    text: "Please send the invoice.",
    result: "请发送发票。",
    resultLang: "zh" as const,
    note: "",
    tone: "ok" as const,
    phase: "idle" as const,
    onChoice: () => undefined,
    onText: () => undefined,
    onSwap: () => undefined,
    onTranslate: () => undefined,
    onSpeak: () => undefined,
    onHear: () => undefined,
    onCopy: () => undefined,
  };

  it("shows direction, typed text, the translation, and Hear it", () => {
    const html = renderToStaticMarkup(createElement(TranslatePanel, props));
    expect(html).toContain("Please send the invoice.");
    expect(html).toContain("请发送发票。");
    expect(html).toContain(">Translate<");
    expect(html).toContain(">翻译<");
    expect(html).toContain(">Speak<");
    expect(html).toContain("说英语");
    expect(html).toContain(">Hear it<");
    expect(html).toContain("听一听");
    expect(html).toContain(">Auto<");
    expect(html).toContain("EN → 中文");
    expect(html).toContain("中文 → EN");
    expect(html).toContain(">Swap<");
    expect(html).toContain("对调");
    expect(html).toContain('id="translate-source"');
    expect(html).toContain('id="translate-go"');
    expect(html).toContain('id="translate-say"');
    expect(html).toContain('id="translate-hear"');
    expect(html).toContain('id="translate-copy"');
    expect(html).toContain("Detected · 已识别");
    expect(html).toContain("English → 中文");
    expect(html).toContain(`maxLength="${TRANSLATE_MAX_CHARS}"`);
    expect(html).toContain('lang="zh-CN"');
  });

  it("asks to speak Chinese when the line is Chinese, and shows a soft network failure", () => {
    const zh = renderToStaticMarkup(
      createElement(TranslatePanel, { ...props, text: "请把发票明天发过来。", result: "Please send the invoice tomorrow.", resultLang: "en" }),
    );
    expect(zh).toContain("说中文");
    expect(zh).toContain("Please send the invoice tomorrow.");
    expect(zh).toContain(">English<");

    const failed = renderToStaticMarkup(
      createElement(TranslatePanel, {
        ...props,
        result: "",
        resultLang: null,
        note: TRANSLATE_FAIL_COPY.network,
        tone: "error",
      }),
    );
    expect(failed).toContain("notice-line");
    expect(failed).toContain("连不上翻译");
    expect(failed).not.toContain('id="translate-hear"');
    expect(COPY_FAIL_NOTE).toContain("没复制上");
  });

  it("turns Speak into Stop while the microphone is open", () => {
    const html = renderToStaticMarkup(createElement(TranslatePanel, { ...props, phase: "listening", result: "", resultLang: null }));
    expect(html).toContain(">Stop<");
    expect(html).toContain("点此结束");
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain('disabled=""');
  });

  it("puts Translate next to Practice and leaves Settings as the gear", () => {
    const nav = renderToStaticMarkup(createElement(ModeNav, { mode: "practice", onChange: () => undefined }));
    expect(nav).toContain('id="mode-practice"');
    expect(nav).toContain('id="mode-translate"');
    expect(nav).toContain(">Practice<");
    expect(nav).toContain(">练习<");
    expect(nav).toContain(">Translate<");
    expect(nav).toContain(">翻译<");
    expect(nav).toContain('aria-pressed="true"');

    const app = readFileSync("src/App.tsx", "utf8");
    expect(app).toContain("<ModeNav");
    expect(app).toContain("<TranslatePanel");
    expect(app).toContain("<PracticePanel");
    expect(app).not.toContain("<BrowserBanner");
    expect(app.match(/id="open-settings"/g)).toHaveLength(1);
    expect(app).not.toContain("Remind me daily");

    const hook = readFileSync("src/translate/useTranslate.ts", "utf8");
    const speak = hook.slice(hook.indexOf("const onSpeak"));
    const mic = speak.indexOf("requestMicrophone()");
    const ctx = speak.indexOf("createRecordingContext()");
    const resume = speak.indexOf("audioCtx.resume()");
    const model = speak.indexOf("ensureModel()");
    expect(mic).toBeGreaterThan(-1);
    expect(ctx).toBeGreaterThan(mic);
    expect(resume).toBeGreaterThan(ctx);
    expect(model).toBeGreaterThan(resume);
    expect(speak).toContain("startCapture(audioCtx, streamPromise");
    expect(speak).toContain('transcribe(pcm, source, "")');
    expect(speak).not.toContain("new AudioContext");
    expect(hook).not.toContain("api.openai.com");
    expect(readFileSync("src/translate/engine.ts", "utf8")).not.toMatch(/sk-[A-Za-z0-9]/);
    expect(readFileSync("src/speech/tts.ts", "utf8")).toContain("export function speakPlain");
  });
});
