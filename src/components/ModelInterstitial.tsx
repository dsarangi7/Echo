import { useEffect, useState } from "react";
import { MODEL_LOAD_ERROR, formatMegabytes } from "../speech/model";
import { ensureModel, modelDownload, subscribeModelDownload, type ModelDownload } from "../speech/stt";
import {
  INTERSTITIAL_BODY,
  INTERSTITIAL_BODY_ZH,
  INTERSTITIAL_SUCCESS,
  INTERSTITIAL_SUCCESS_ZH,
  INTERSTITIAL_TITLE,
  INTERSTITIAL_TITLE_ZH,
  dismissInterstitialAfterSuccess,
  loadInterstitialDismissed,
  shouldShowDownloadInterstitial,
} from "../ui/modelInterstitial";

type CardProps = {
  mode: "download" | "success" | "error";
  meter: string | null;
  pct: number | null;
  onContinue: () => void;
  onHearFirst: () => void;
  onDismiss: () => void;
};

export function ModelInterstitialCard({ mode, meter, pct, onContinue, onHearFirst, onDismiss }: CardProps) {
  return (
    <section className="model-interstitial" id="model-interstitial" aria-label={INTERSTITIAL_TITLE}>
      <h2>
        {INTERSTITIAL_TITLE}
        <small>{INTERSTITIAL_TITLE_ZH}</small>
      </h2>
      {mode === "success" ? (
        <p className="model-copy">
          <b>{INTERSTITIAL_SUCCESS}</b>
          <small>{INTERSTITIAL_SUCCESS_ZH}</small>
        </p>
      ) : mode === "error" ? (
        <p className="model-copy">{MODEL_LOAD_ERROR}</p>
      ) : (
        <p className="model-copy">
          <b>{INTERSTITIAL_BODY}</b>
          <small>{INTERSTITIAL_BODY_ZH}</small>
        </p>
      )}
      {mode === "download" ? (
        <>
          <div
            className="model-meter"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={pct ?? undefined}
            aria-valuetext={meter ?? undefined}
          >
            <span style={{ width: pct == null ? "0%" : `${pct}%` }} />
          </div>
          <p className="model-meter-label" id="model-meter">
            {meter ?? "…"}
          </p>
        </>
      ) : null}
      <div className="actions model-actions">
        {mode !== "success" ? (
          <button type="button" className="act primary" id="model-continue" onClick={onContinue}>
            <b>Continue download</b>
            <small>继续下载</small>
          </button>
        ) : null}
        {mode !== "success" ? (
          <button type="button" className="act ghost" id="model-hear-first" onClick={onHearFirst}>
            <b>Hear it first</b>
            <small>先听一听</small>
          </button>
        ) : (
          <button type="button" className="act ghost" id="model-dismiss" onClick={onDismiss}>
            <b>Don't show again after success</b>
            <small>成功后不再显示</small>
          </button>
        )}
      </div>
    </section>
  );
}

function safeLocal(): Storage | null {
  try {
    if (typeof localStorage === "undefined") return null;
    return localStorage;
  } catch {
    return null;
  }
}

function meterOf(download: ModelDownload): string | null {
  if (download.pct == null) return null;
  return `${download.pct}% · ${formatMegabytes(download.loaded)} / ${formatMegabytes(download.total)}`;
}

/** In-flow card. Hear it and the packs stay usable underneath. */
export function ModelInterstitial({ onHearFirst }: { onHearFirst: () => void }) {
  const [download, setDownload] = useState<ModelDownload>(() => modelDownload());
  const [dismissed, setDismissed] = useState(() => loadInterstitialDismissed(safeLocal()));
  const [hearFirst, setHearFirst] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [sawPartial, setSawPartial] = useState(false);
  const [latched, setLatched] = useState(false);

  useEffect(() => {
    const started = Date.now();
    const id = window.setInterval(() => setElapsed(Date.now() - started), 100);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    return subscribeModelDownload((next) => {
      setDownload(next);
      if (next.phase === "loading" && next.total > 0 && next.loaded < next.total) setSawPartial(true);
    });
  }, []);

  useEffect(() => {
    if (download.phase === "loading" && (sawPartial || elapsed >= 400)) setLatched(true);
  }, [download.phase, sawPartial, elapsed]);

  const view = shouldShowDownloadInterstitial({
    dismissed,
    hearFirst,
    phase: download.phase,
    elapsedMs: elapsed,
    sawPartial,
    latched,
  });
  if (!view.show) return null;

  return (
    <ModelInterstitialCard
      mode={view.mode}
      meter={meterOf(download)}
      pct={download.pct}
      onContinue={() => {
        void ensureModel().catch(() => undefined);
      }}
      onHearFirst={() => {
        setHearFirst(true);
        onHearFirst();
      }}
      onDismiss={() => {
        if (dismissInterstitialAfterSuccess(safeLocal(), download.phase)) setDismissed(true);
      }}
    />
  );
}
