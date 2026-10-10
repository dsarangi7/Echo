type Props = {
  current: number;
  best: number;
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

/** Current streak and best streak. Numbers come from Kai's getStreak(). */
export function StreakFlame({ current, best }: Props) {
  const lit = current > 0;
  const label = `Current streak ${current}, best streak ${best}. 当前连续 ${current}，最佳连续 ${best}。`;

  return (
    <div className={lit ? "streak-strip" : "streak-strip is-quiet"} id="streak-strip" aria-label={label}>
      <Flame lit={lit} />
      <span className="streak-count" id="streak-current">
        <b>{current}</b>
        <span>Streak</span>
        <small>连续</small>
      </span>
      <span className="streak-count streak-best" id="streak-best">
        <b>{best}</b>
        <span>Best</span>
        <small>最佳连续</small>
      </span>
    </div>
  );
}
