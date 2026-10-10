import type { ReminderPreference } from "../streak";
import { REMINDER_LABEL, REMINDER_PWA, REMINDER_SAVED, formatTimeValue, parseTimeValue } from "../ui/streakCopy";

type Props = {
  enabled: boolean;
  hour: number;
  minute: number;
  onChange: (next: ReminderPreference) => void;
};

/** Daily reminder toggle and 24h time. Persistence and push stay with Kai. */
export function ReminderControl({ enabled, hour, minute, onChange }: Props) {
  const value = formatTimeValue(hour, minute);

  return (
    <div className="reminder-row" id="reminder-control">
      <button
        type="button"
        id="reminder-toggle"
        className={enabled ? "reminder-toggle on" : "reminder-toggle"}
        aria-pressed={enabled}
        aria-describedby="reminder-note"
        aria-label={enabled ? "Daily reminder on. 每天提醒已开" : "Daily reminder off. 每天提醒已关"}
        onClick={() => onChange({ enabled: !enabled, hour, minute })}
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
        value={value}
        aria-describedby="reminder-note"
        onChange={(event) => {
          const parsed = parseTimeValue(event.target.value);
          if (!parsed) return;
          onChange({ enabled, hour: parsed.hour, minute: parsed.minute });
        }}
      />
      <p className="reminder-note" id="reminder-note">
        {enabled ? (
          <>
            <span className="saved">{REMINDER_SAVED.en}</span>
            <small>{REMINDER_SAVED.zh}</small>
          </>
        ) : null}
        <span className="hint">{REMINDER_PWA.en}</span>
        <small>{REMINDER_PWA.zh}</small>
      </p>
    </div>
  );
}
