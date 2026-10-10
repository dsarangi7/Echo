export type MicFailure = "no-mic" | "denied" | "failed";

export type CaptureResult =
  | { samples: Float32Array; sampleRate: number }
  | "no-speech"
  | MicFailure
  | "cancelled";

export type CaptureHandle = {
  finish: () => void;
  cancel: () => void;
  done: Promise<CaptureResult>;
};

const SPEECH_RMS = 0.012;
export const MIN_SPEECH_MS = 280;
/** A little more voiced audio before a short Chinese line is sent to Whisper tiny. */
export const SHORT_ZH_MIN_SPEECH_MS = 420;

export const MIC_DENIED =
  "Microphone is blocked. Allow the microphone in the browser settings, then try again. 麦克风被拦住了。请在浏览器设置里允许麦克风，然后再试。";

export const MIC_NONE = "No microphone on this device. 这台设备没有麦克风。";

export const MIC_FAILED =
  "Could not open the microphone. Allow the microphone in the browser settings, then try again. 麦克风没打开。请在浏览器设置里允许麦克风，然后再试。";

export const MIC_INSECURE =
  "Could not open the microphone on this page. Open the HTTPS site and allow the microphone in the browser settings, then try again. 这个页面打不开麦克风。请打开 HTTPS 网页，在浏览器设置里允许麦克风后再试。";

export class MicRequestError extends Error {
  readonly failure: MicFailure;

  constructor(failure: MicFailure, message: string) {
    super(message);
    this.name = "MicRequestError";
    this.failure = failure;
  }
}

type LegacyGetUserMedia = (
  constraints: MediaStreamConstraints,
  onSuccess: (stream: MediaStream) => void,
  onError: (err: unknown) => void,
) => void;

export type MicNavigator = {
  mediaDevices?: { getUserMedia?: (constraints: MediaStreamConstraints) => Promise<MediaStream> };
  getUserMedia?: LegacyGetUserMedia;
  webkitGetUserMedia?: LegacyGetUserMedia;
  mozGetUserMedia?: LegacyGetUserMedia;
  audioSession?: { type: string };
};

type AudioCtor = typeof AudioContext;

function readErrorName(err: unknown): string {
  if (typeof err !== "object" || err === null || !("name" in err)) return "";
  const name = (err as { name?: unknown }).name;
  return typeof name === "string" ? name : "";
}

function readErrorMessage(err: unknown): string {
  if (typeof err !== "object" || err === null || !("message" in err)) return typeof err === "string" ? err : "";
  const message = (err as { message?: unknown }).message;
  return typeof message === "string" ? message : "";
}

/** Map a getUserMedia rejection to denied, no-mic, or a generic failure. */
export function classifyMicError(err: unknown): MicFailure {
  if (err instanceof MicRequestError) return err.failure;
  const name = readErrorName(err);
  const message = readErrorMessage(err).toLowerCase();

  if (name === "NotFoundError" || name === "DevicesNotFoundError") return "no-mic";
  if (name === "NotAllowedError" || name === "PermissionDeniedError") return "denied";
  if (
    message.includes("permission denied") ||
    message.includes("permission dismissed") ||
    message.includes("user denied")
  ) {
    return "denied";
  }
  if (
    message.includes("requested device not found") ||
    message.includes("device not found") ||
    message.includes("no microphone")
  ) {
    return "no-mic";
  }
  // NotReadableError, OverconstrainedError, AbortError, SecurityError, TypeError, and unknown.
  return "failed";
}

export function micFailureMessage(kind: MicFailure, options?: { secure?: boolean }): string {
  if (kind === "no-mic") return MIC_NONE;
  if (kind === "denied") return MIC_DENIED;
  if (options?.secure === false) return MIC_INSECURE;
  return MIC_FAILED;
}

export function isSecurePage(win: { isSecureContext?: boolean } | undefined = typeof window === "undefined" ? undefined : window): boolean {
  return win?.isSecureContext !== false;
}

/**
 * Hear it sets the iOS audio session to `playback`, which cannot record.
 * Say it switches to `play-and-record` in the same tap, before getUserMedia.
 */
export function preferRecordSession(nav: { audioSession?: { type: string } } | null | undefined): void {
  const session = nav?.audioSession;
  if (!session) return;
  const previous = session.type;
  try {
    session.type = "play-and-record";
  } catch {
    try {
      session.type = "auto";
    } catch {
      try {
        session.type = previous;
      } catch {
        // Leave whatever session the browser kept.
      }
    }
  }
}

function currentNavigator(): MicNavigator | undefined {
  return typeof navigator === "undefined" ? undefined : (navigator as MicNavigator);
}

/**
 * Start the mic permission request. Call this synchronously from the Say it tap.
 * `{ audio: true }` stays in that turn; a constraint object is a common mobile reject,
 * and a later retry is outside the gesture on Safari.
 */
export function requestMicrophone(nav: MicNavigator | undefined = currentNavigator()): Promise<MediaStream> {
  preferRecordSession(nav);
  const media = nav?.mediaDevices;
  const gum = media?.getUserMedia;
  if (media && typeof gum === "function") {
    try {
      return gum.call(media, { audio: true });
    } catch (err) {
      return Promise.reject(err);
    }
  }

  const legacy = nav?.getUserMedia ?? nav?.webkitGetUserMedia ?? nav?.mozGetUserMedia;
  if (typeof legacy === "function" && nav) {
    return new Promise((resolve, reject) => {
      try {
        legacy.call(nav, { audio: true }, resolve, reject);
      } catch (err) {
        reject(err);
      }
    });
  }

  const why = isSecurePage() ? "This browser has no microphone API." : "Microphone requires a secure (HTTPS) page.";
  return Promise.reject(new MicRequestError("failed", why));
}

export function releaseStream(pending: Promise<MediaStream>): Promise<void> {
  return pending.then(
    (stream) => {
      stream.getTracks().forEach((track) => track.stop());
    },
    () => undefined,
  );
}

export function createRecordingContext(win: Window | undefined = typeof window === "undefined" ? undefined : window): AudioContext {
  const host = win as (Window & { AudioContext?: AudioCtor; webkitAudioContext?: AudioCtor }) | undefined;
  const Ctor = host?.AudioContext ?? host?.webkitAudioContext;
  if (!Ctor) throw new MicRequestError("failed", "AudioContext missing");
  return new Ctor();
}

function concat(chunks: Float32Array[]): Float32Array {
  let n = 0;
  for (const chunk of chunks) n += chunk.length;
  const out = new Float32Array(n);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

function stopTracks(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}

export function startCapture(
  ctx: AudioContext,
  streamRequest: Promise<MediaStream>,
  options: { maxMs: number; silenceMs: number; minSpeechMs?: number; onLevel?: (rms: number) => void },
): CaptureHandle {
  const minSpeechMs = options.minSpeechMs ?? MIN_SPEECH_MS;
  let finish: () => void = () => undefined;
  let cancel: () => void = () => undefined;

  const done = new Promise<CaptureResult>((resolve) => {
    let settled = false;
    const stop = (result: CaptureResult) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };

    const chunks: Float32Array[] = [];
    let heardSpeech = false;
    let speechMs = 0;
    let silenceMs = 0;
    let elapsedMs = 0;
    let closed = false;
    let stream: MediaStream | null = null;
    let processor: ScriptProcessorNode | null = null;

    try {
      void ctx.resume();
    } catch {
      // The Say it tap also resumes. A throw here still lets the stream path report failure.
    }

    const shutdown = () => {
      if (closed) return;
      closed = true;
      processor?.disconnect();
      stopTracks(stream);
      void ctx.close();
    };

    finish = () => {
      shutdown();
      if (!heardSpeech || speechMs < minSpeechMs) {
        stop("no-speech");
        return;
      }
      stop({ samples: concat(chunks), sampleRate: ctx.sampleRate });
    };

    cancel = () => {
      shutdown();
      stop("cancelled");
    };

    const attach = (live: MediaStream) => {
      stream = live;
      const source = ctx.createMediaStreamSource(live);
      const node = ctx.createScriptProcessor(4096, 1, 1);
      processor = node;
      const mute = ctx.createGain();
      mute.gain.value = 0;
      node.onaudioprocess = (event) => {
        if (settled) return;
        const input = event.inputBuffer.getChannelData(0);
        chunks.push(new Float32Array(input));
        let sum = 0;
        for (let i = 0; i < input.length; i++) sum += input[i] * input[i];
        const rms = Math.sqrt(sum / input.length);
        options.onLevel?.(rms);
        const frameMs = (input.length / ctx.sampleRate) * 1000;
        elapsedMs += frameMs;
        if (rms >= SPEECH_RMS) {
          heardSpeech = true;
          speechMs += frameMs;
          silenceMs = 0;
        } else if (heardSpeech) {
          silenceMs += frameMs;
        }
        const quietLongEnough = heardSpeech && speechMs >= minSpeechMs && silenceMs >= options.silenceMs;
        const gaveUp = !heardSpeech && elapsedMs >= 6000;
        if (quietLongEnough || gaveUp || elapsedMs >= options.maxMs) finish();
      };
      source.connect(node);
      node.connect(mute);
      mute.connect(ctx.destination);
    };

    void streamRequest
      .then(async (live) => {
        if (settled || closed) {
          stopTracks(live);
          return;
        }
        const tracks = typeof live.getAudioTracks === "function" ? live.getAudioTracks() : [];
        if (tracks.length === 0) {
          stopTracks(live);
          shutdown();
          stop("no-mic");
          return;
        }
        try {
          if (ctx.state === "suspended") await ctx.resume();
        } catch {
          // Fall through and treat a still-suspended context as a failed open.
        }
        if (settled || closed) {
          stopTracks(live);
          return;
        }
        if (ctx.state === "suspended") {
          stopTracks(live);
          shutdown();
          stop("failed");
          return;
        }
        try {
          attach(live);
        } catch (err) {
          stopTracks(live);
          shutdown();
          stop(classifyMicError(err));
        }
      })
      .catch((err: unknown) => {
        shutdown();
        stop(classifyMicError(err));
      });
  });

  return {
    finish: () => finish(),
    cancel: () => cancel(),
    done,
  };
}
