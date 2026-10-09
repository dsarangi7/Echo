export type CaptureResult =
  | { samples: Float32Array; sampleRate: number }
  | "no-speech"
  | "no-mic"
  | "denied"
  | "cancelled";

export type CaptureHandle = {
  finish: () => void;
  cancel: () => void;
  done: Promise<CaptureResult>;
};

const SPEECH_RMS = 0.012;
const MIN_SPEECH_MS = 280;

function isDenied(err: unknown): boolean {
  const name = err instanceof DOMException ? err.name : "";
  return name === "NotAllowedError" || name === "PermissionDeniedError" || name === "SecurityError";
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

export function startCapture(
  ctx: AudioContext,
  options: { maxMs: number; silenceMs: number; onLevel?: (rms: number) => void },
): CaptureHandle {
  let finish: () => void = () => undefined;
  let cancel: () => void = () => undefined;

  const done = new Promise<CaptureResult>((resolve) => {
    let settled = false;
    const stop = (result: CaptureResult) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };

    if (!navigator.mediaDevices?.getUserMedia) {
      void ctx.close();
      stop("no-mic");
      return;
    }

    const chunks: Float32Array[] = [];
    let heardSpeech = false;
    let speechMs = 0;
    let silenceMs = 0;
    let elapsedMs = 0;
    let closed = false;
    let stream: MediaStream | null = null;
    let processor: ScriptProcessorNode | null = null;

    const shutdown = () => {
      if (closed) return;
      closed = true;
      processor?.disconnect();
      stream?.getTracks().forEach((track) => track.stop());
      void ctx.close();
    };

    finish = () => {
      shutdown();
      if (!heardSpeech || speechMs < MIN_SPEECH_MS) {
        stop("no-speech");
        return;
      }
      stop({ samples: concat(chunks), sampleRate: ctx.sampleRate });
    };

    cancel = () => {
      shutdown();
      stop("cancelled");
    };

    void navigator.mediaDevices
      .getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 },
      })
      .catch((err: unknown) => {
        if (isDenied(err)) throw err;
        return navigator.mediaDevices.getUserMedia({ audio: true });
      })
      .then((live) => {
        if (settled) {
          live.getTracks().forEach((track) => track.stop());
          return;
        }
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
          const quietLongEnough = heardSpeech && speechMs >= MIN_SPEECH_MS && silenceMs >= options.silenceMs;
          const gaveUp = !heardSpeech && elapsedMs >= 6000;
          if (quietLongEnough || gaveUp || elapsedMs >= options.maxMs) finish();
        };
        source.connect(node);
        node.connect(mute);
        mute.connect(ctx.destination);
      })
      .catch((err: unknown) => {
        shutdown();
        stop(isDenied(err) ? "denied" : "no-mic");
      });
  });

  return {
    finish: () => finish(),
    cancel: () => cancel(),
    done,
  };
}
