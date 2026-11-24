import { motion, useReducedMotion } from "framer-motion";

/**
 * The reward: a red 印章 pressed onto the card.
 * Clear → square seal 很好 ("very good"). Partial → round seal 加油 ("keep going").
 */
export type StampKind = "clear" | "partial";

const COPY: Record<StampKind, { a: string; b: string; label: string }> = {
  clear: { a: "很", b: "好", label: "很好 · Very good" },
  partial: { a: "加", b: "油", label: "加油 · Keep going" },
};

export function SealStamp({ kind }: { kind: StampKind }) {
  const calm = Boolean(useReducedMotion());
  const copy = COPY[kind];
  const round = kind === "partial";
  return (
    <motion.div
      className={`seal-stamp ${kind}`}
      role="img"
      aria-label={copy.label}
      initial={calm ? { opacity: 0 } : { opacity: 0, scale: 2.4, rotate: -24 }}
      animate={calm ? { opacity: 1 } : { opacity: 1, scale: 1, rotate: round ? 8 : -9 }}
      transition={calm ? { duration: 0.2 } : { type: "spring", stiffness: 520, damping: 22, mass: 0.9 }}
    >
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <defs>
          <filter id={`ink-${kind}`} x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence type="fractalNoise" baseFrequency="0.08" numOctaves="3" seed={kind === "clear" ? 3 : 7} result="n" />
            <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -4 0 0 0 3.1" result="holes" />
            <feComposite in="SourceGraphic" in2="holes" operator="in" />
          </filter>
        </defs>
        <g filter={`url(#ink-${kind})`}>
          {round ? (
            <>
              <circle cx="50" cy="50" r="44" fill="none" stroke="currentColor" strokeWidth="7" />
              <circle cx="50" cy="50" r="36" fill="none" stroke="currentColor" strokeWidth="1.6" />
              <text x="50" y="47" textAnchor="middle" fontSize="28" fontWeight="800" fill="currentColor" fontFamily="'Echo Serif SC', serif">
                {copy.a}
              </text>
              <text x="50" y="75" textAnchor="middle" fontSize="28" fontWeight="800" fill="currentColor" fontFamily="'Echo Serif SC', serif">
                {copy.b}
              </text>
            </>
          ) : (
            <>
              <rect x="6" y="6" width="88" height="88" rx="8" fill="currentColor" />
              <rect x="13" y="13" width="74" height="74" rx="4" fill="none" stroke="#FFF6EA" strokeWidth="2" />
              <text x="50" y="47" textAnchor="middle" fontSize="32" fontWeight="700" fill="#FFF6EA" fontFamily="'Echo Serif SC', serif">
                {copy.a}
              </text>
              <text x="50" y="80" textAnchor="middle" fontSize="32" fontWeight="700" fill="#FFF6EA" fontFamily="'Echo Serif SC', serif">
                {copy.b}
              </text>
            </>
          )}
        </g>
      </svg>
    </motion.div>
  );
}
