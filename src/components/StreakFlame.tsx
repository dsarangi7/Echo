type Props = {
  current: number;
  best: number;
  todayClears?: number;
  goal?: number;
  dayComplete?: boolean;
};

function Flame({ lit }: { lit: boolean }) {
  return (
    <svg
      className={lit ? "streak-flame" : "streak-flame is-dim"}
      viewBox="0 0 24 32"
      aria-hidden="true"
    >
      <path
        fill="currentColor"
        d="M12 1.2c.3 3.6-1.7 5.8-3.4 8.1C6.6 12 5.2 14.2 5.2 17.2 5.2 22 8.3 26 12.2 26c4 0 7-3.8 7-8.6 0-3.3-1.9-5.6-3.8-8.3-1.1 2.3-2.2 3.3-3.5 3.3.3-3.8.7-7.6.1-11.2z"
      />
      <path
        fill="#f6ead4"
        d="M12.1 15.2c.8 1.7 0 3-1.1 4-.7.8-1.4 1.7-1.4 2.9 0 1.8 1.3 3.1 2.6 3.1s2.7-1.3 2.7-3.1c0-1.5-.9-2.4-1.7-3.5-.3.9-.8 1.5-1.3 1.5.1-1.7.3-3.6.2-4.9z"
      />
    </svg>
  );
}

/** Day streak and today's clear-match progress. Numbers come from usePracticeStreak(). */
export function StreakFlame({ current, best, todayClears = 0, goal = 5, dayComplete = false }: Props) {
  const lit = dayComplete || current > 0;
  const shown = Math.min(todayClears, goal);
  const showToday = !dayComplete && todayClears > 0;
  const label = showToday
    ? `${shown} of ${goal} today. Streak ${current}, best ${best}. 今天 ${shown}/${goal}。连续 ${current}，最佳 ${best}。`
    : `Streak ${current}, best ${best}. 连续 ${current}，最佳 ${best}。${dayComplete ? " Day complete. 今天完成。" : ""}`;

  return (
    <div className={lit ? "streak-strip" : "streak-strip is-quiet"} id="streak-strip" aria-label={label}>
      <Flame lit={lit} />
      <span className="streak-count" id="streak-current">
        <b>{showToday ? `${shown}/${goal}` : `${current}`}</b>
        <span>{showToday ? "Today" : "Streak"}</span>
        <small>{showToday ? "今天" : "连续"}</small>
      </span>
      <span className="streak-count streak-best" id="streak-best">
        <b>{best}</b>
        <span>Best</span>
        <small>最佳连续</small>
      </span>
    </div>
  );
}
