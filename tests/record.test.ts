import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  MIC_DENIED,
  MIC_FAILED,
  MIC_INSECURE,
  MIC_NONE,
  classifyMicError,
  micFailureMessage,
  preferRecordSession,
  releaseStream,
  requestMicrophone,
  startCapture,
  type MicNavigator,
} from "../src/speech/record";

function namedError(name: string, message = name): Error {
  const err = new Error(message);
  err.name = name;
  return err;
}

function fakeStream(audioTracks = 1): MediaStream {
  const tracks = Array.from({ length: audioTracks }, () => ({
    kind: "audio" as const,
    stop() {},
  }));
  return {
    getTracks: () => tracks,
    getAudioTracks: () => tracks,
  } as unknown as MediaStream;
}

type AudioHandler = (event: { inputBuffer: { getChannelData: (channel: number) => Float32Array } }) => void;

function fakeContext(state: AudioContextState = "running") {
  let handler: AudioHandler | null = null;
  let closes = 0;
  const ctx = {
    sampleRate: 16000,
    state,
    destination: {},
    resume: () => Promise.resolve(),
    close: () => {
      closes += 1;
      return Promise.resolve();
    },
    createMediaStreamSource: () => ({ connect() {}, disconnect() {} }),
    createScriptProcessor: () => ({
      connect() {},
      disconnect() {},
      set onaudioprocess(fn: AudioHandler) {
        handler = fn;
      },
    }),
    createGain: () => ({
      gain: { value: 1 },
      connect() {},
    }),
  } as unknown as AudioContext;
  return {
    ctx,
    closes: () => closes,
    push(samples: Float32Array) {
      if (!handler) throw new Error("processor not attached");
      handler({ inputBuffer: { getChannelData: () => samples } });
    },
  };
}

describe("microphone errors", () => {
  it("keeps denied, no-mic, and other failures apart", () => {
    expect(classifyMicError(namedError("NotAllowedError"))).toBe("denied");
    expect(classifyMicError(namedError("PermissionDeniedError"))).toBe("denied");
    expect(classifyMicError(namedError("Error", "User denied permission"))).toBe("denied");
    expect(classifyMicError(namedError("NotFoundError"))).toBe("no-mic");
    expect(classifyMicError(namedError("DevicesNotFoundError"))).toBe("no-mic");
    expect(classifyMicError(namedError("Error", "Requested device not found"))).toBe("no-mic");
    for (const name of ["NotReadableError", "OverconstrainedError", "AbortError", "SecurityError", "TypeError"]) {
      expect(classifyMicError(namedError(name)), name).toBe("failed");
    }
  });

  it("explains each failure in English and 中文", () => {
    expect(MIC_DENIED).toContain("Allow the microphone in the browser settings");
    expect(MIC_DENIED).toContain("请在浏览器设置里允许麦克风");
    expect(MIC_FAILED).toContain("Allow the microphone in the browser settings");
    expect(MIC_FAILED).toContain("请在浏览器设置里允许麦克风");
    expect(MIC_NONE).toContain("No microphone on this device");
    expect(MIC_NONE).toContain("这台设备没有麦克风");
    expect(MIC_INSECURE).toContain("HTTPS");
    expect(MIC_INSECURE).toContain("允许麦克风");
    expect(micFailureMessage("denied")).toBe(MIC_DENIED);
    expect(micFailureMessage("no-mic")).toBe(MIC_NONE);
    expect(micFailureMessage("failed")).toBe(MIC_FAILED);
    expect(micFailureMessage("failed", { secure: false })).toBe(MIC_INSECURE);
    expect(micFailureMessage("no-mic")).not.toContain("Allow the microphone");
  });
});

describe("requestMicrophone", () => {
  it("switches off a playback session and calls getUserMedia({ audio: true }) in that turn", async () => {
    const events: string[] = [];
    let sessionType = "playback";
    const nav: MicNavigator = {
      audioSession: {
        get type() {
          return sessionType;
        },
        set type(value: string) {
          events.push(`session:${value}`);
          sessionType = value;
        },
      },
      mediaDevices: {
        getUserMedia(constraints) {
          events.push(`gum:${JSON.stringify(constraints)}:${sessionType}`);
          return Promise.resolve(fakeStream());
        },
      },
    };

    const pending = requestMicrophone(nav);
    expect(events).toEqual(["session:play-and-record", 'gum:{"audio":true}:play-and-record']);
    await expect(pending).resolves.toBeTruthy();
  });

  it("uses the legacy callback API when mediaDevices is missing", async () => {
    const nav: MicNavigator = {
      webkitGetUserMedia(constraints, onSuccess) {
        expect(constraints).toEqual({ audio: true });
        onSuccess(fakeStream());
      },
    };
    const stream = await requestMicrophone(nav);
    expect(stream.getAudioTracks()).toHaveLength(1);
  });

  it("reports a missing microphone API as failed, not no-mic", async () => {
    const err = await requestMicrophone({}).catch((reason: unknown) => reason);
    expect(classifyMicError(err)).toBe("failed");
  });

  it("falls back to auto when play-and-record is rejected", () => {
    const session = {
      current: "playback",
      get type() {
        return this.current;
      },
      set type(value: string) {
        if (value === "play-and-record") throw new Error("unsupported");
        this.current = value;
      },
    };
    preferRecordSession({ audioSession: session });
    expect(session.current).toBe("auto");
  });
});

describe("startCapture", () => {
  it("returns samples after speech and a short pause", async () => {
    const harness = fakeContext();
    const handle = startCapture(harness.ctx, Promise.resolve(fakeStream()), { maxMs: 15000, silenceMs: 100 });
    await Promise.resolve();
    const loud = new Float32Array(4096);
    loud.fill(0.2);
    harness.push(loud);
    harness.push(loud);
    harness.push(new Float32Array(4096));
    const recorded = await handle.done;
    expect(recorded).toMatchObject({ sampleRate: 16000 });
    if (typeof recorded === "object") expect(recorded.samples.length).toBe(4096 * 3);
    expect(harness.closes()).toBe(1);
  });

  it("does not call a busy or overconstrained mic a missing microphone", async () => {
    for (const name of ["NotReadableError", "OverconstrainedError", "AbortError", "SecurityError"]) {
      const harness = fakeContext();
      const handle = startCapture(harness.ctx, Promise.reject(namedError(name)), { maxMs: 1000, silenceMs: 100 });
      await expect(handle.done).resolves.toBe("failed");
    }
  });

  it("maps permission and missing-device results", async () => {
    const denied = startCapture(fakeContext().ctx, Promise.reject(namedError("NotAllowedError")), {
      maxMs: 1000,
      silenceMs: 100,
    });
    await expect(denied.done).resolves.toBe("denied");

    const missing = startCapture(fakeContext().ctx, Promise.resolve(fakeStream(0)), { maxMs: 1000, silenceMs: 100 });
    await expect(missing.done).resolves.toBe("no-mic");
  });

  it("reports no speech when the tap ends before anyone talks", async () => {
    const harness = fakeContext();
    const handle = startCapture(harness.ctx, Promise.resolve(fakeStream()), { maxMs: 15000, silenceMs: 900 });
    await Promise.resolve();
    handle.finish();
    await expect(handle.done).resolves.toBe("no-speech");
  });

  it("treats a context that stays suspended as failed", async () => {
    const harness = fakeContext("suspended");
    const handle = startCapture(harness.ctx, Promise.resolve(fakeStream()), { maxMs: 1000, silenceMs: 100 });
    await expect(handle.done).resolves.toBe("failed");
    expect(harness.closes()).toBe(1);
  });

  it("stops a stream that was opened when recording cannot start", async () => {
    let stopped = 0;
    const stream = fakeStream();
    stream.getTracks()[0].stop = () => {
      stopped += 1;
    };
    await releaseStream(Promise.resolve(stream));
    expect(stopped).toBe(1);
    await releaseStream(Promise.reject(namedError("NotAllowedError")));
  });
});

describe("Say it page", () => {
  it("requests the mic before opening an AudioContext and keeps Whisper", () => {
    const practice = readFileSync("src/practice/usePractice.ts", "utf8");
    const say = practice.slice(practice.indexOf("const sayIt"));
    const mic = say.indexOf("requestMicrophone()");
    const ctx = say.indexOf("createRecordingContext()");
    const resume = say.indexOf("audioCtx.resume()");
    const model = say.indexOf("ensureModel()");
    expect(mic).toBeGreaterThan(-1);
    expect(ctx).toBeGreaterThan(mic);
    expect(resume).toBeGreaterThan(ctx);
    expect(model).toBeGreaterThan(resume);
    expect(say).toContain("startCapture(audioCtx, streamPromise");
    expect(say).not.toContain("new AudioContext");
    expect(say).toContain('recorded === "failed"');
    expect(practice).toContain("transcribe(");
  });

  it("drops the class-demo footer and keeps the short practice hints", () => {
    const app = readFileSync("src/App.tsx", "utf8");
    const css = readFileSync("src/index.css", "utf8");
    const panel = readFileSync("src/components/PracticePanel.tsx", "utf8");
    expect(app).not.toMatch(/Talking Tom|课堂演示|Class demo|<footer/);
    expect(css).not.toMatch(/footer\.note/);
    expect(panel).toContain('id="legend-score"');
    expect(panel).toContain("arrow keys change the sentence");
  });
});
