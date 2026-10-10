import { parseReminderTime } from "../practice/shanghai";
import {
  REMINDER_DENIED,
  REMINDER_LABEL,
  REMINDER_ON,
  REMINDER_PWA,
  REMINDER_UNAVAILABLE,
  type ReminderNote,
} from "../ui/streakCopy";

type Props = {
  enabled: boolean;
  /** 24-hour HH:MM from useReminderSettings(). */
  time: string;
  note: ReminderNote;
  onChange: (next: { enabled: boolean; time: string }) => void;
};

/** Some browsers append seconds. Kai's parser wants HH:MM. */
function timeFromInput(value: string): string | null {
  const withSeconds = /^(\d{1,2}:\d{2}):\d{2}$/.exec(value.trim());
  return parseReminderTime(withSeconds ? withSeconds[1] : value);
}

/** Daily reminder toggle and 24h time. Storage and delivery stay in Kai's modules. */
export function ReminderControl({ enabled, time, note, onChange }: Props) {
  const status =
    note === "denied" ? REMINDER_DENIED : note === "unavailable" ? REMINDER_UNAVAILABLE : note === "on" ? REMINDER_ON : null;

  return (
    <div className="reminder-row" id="reminder-control">
      <button
        type="button"
        id="reminder-toggle"
        className={enabled ? "reminder-toggle on" : "reminder-toggle"}
        aria-pressed={enabled}
        aria-describedby="reminder-note"
        aria-label={enabled ? "Daily reminder on. 每天提醒已开" : "Daily reminder off. 每天提醒已关"}
        onClick={() => onChange({ enabled: !enabled, time })}
      >
        <span aria-hidden="true" />
      </button>
      <label className="reminder-label" id="reminder-label" htmlFor="reminder-time">
        <b>{REMINDER_LABEL.en}</b>
        <small>{REMINDER_LABEL.zh}</small>
      </label>
      <input
        id="reminder-time"
        className="reminder-time"
        type="time"
        lang="en-GB"
        step={60}
        value={time}
        aria-describedby="reminder-note"
        onChange={(event) => {
          const parsed = timeFromInput(event.target.value);
          if (!parsed) return;
          onChange({ enabled, time: parsed });
        }}
      />
      <p className="reminder-note" id="reminder-note" role="status">
        {status ? (
          <>
            <span className="saved">{status.en}</span>
            <small>{status.zh}</small>
          </>
        ) : null}
        <span className="hint">{REMINDER_PWA.en}</span>
        <small>{REMINDER_PWA.zh}</small>
      </p>
    </div>
  );
}
