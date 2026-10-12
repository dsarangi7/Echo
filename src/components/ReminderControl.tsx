import { parseReminderTime } from "../practice/shanghai";
import {
  REMINDER_DENIED,
  REMINDER_HONESTY,
  REMINDER_LABEL,
  REMINDER_ON,
  REMINDER_PASSED,
  REMINDER_UNAVAILABLE,
  reminderWaitingCopy,
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
    note === "denied"
      ? REMINDER_DENIED
      : note === "unavailable"
        ? REMINDER_UNAVAILABLE
        : note === "passed"
          ? REMINDER_PASSED
          : note === "waiting"
            ? reminderWaitingCopy(time)
            : note === "on"
              ? REMINDER_ON
              : null;

  return (
    <div className="reminder-row" id="reminder-control">
      <button
        type="button"
        id="reminder-toggle"
        className={enabled ? "reminder-toggle on" : "reminder-toggle"}
        aria-pressed={enabled}
        aria-labelledby="reminder-label"
        aria-describedby="reminder-note"
        onClick={() => onChange({ enabled: !enabled, time })}
      >
        <span aria-hidden="true" />
      </button>
      <p className="reminder-label" id="reminder-label">
        <b>{REMINDER_LABEL.en}</b>
        <small>{REMINDER_LABEL.zh}</small>
      </p>
      <input
        id="reminder-time"
        className="reminder-time"
        type="time"
        lang="en-GB"
        step={60}
        value={time}
        aria-label="Reminder time, local"
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
        <span className="hint">{REMINDER_HONESTY.en}</span>
        <small>{REMINDER_HONESTY.zh}</small>
      </p>
    </div>
  );
}
