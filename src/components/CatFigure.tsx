import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { seasonFor, type Season } from "../ui/season";

/**
 * 课猫 Echo — an original cat drawn in ink on rice paper.
 * One SVG, two framings: the full figure (landing) and a head-and-paws peek
 * that sits on the edge of the practice card.
 */
export type CatMood = "idle" | "listen" | "talk" | "think" | "happy" | "oops" | "sleepy";

type Props = {
  mood: CatMood;
  /** 0–1. Mouth opening while talking, mic level while listening. */
  level?: number;
  variant?: "full" | "peek";
  season?: Season;
  className?: string;
  title?: string;
};

const FUR = "#F1E8D8";
const FUR_SHADE = "#DED0B8";
const INK = "#2A2520";
const EAR = "#E8A497";
const BLUSH = "#F0937F";
const SEAL = "#C8372D";
const JADE = "#3F8A68";

/** Idle for this long and the cat dozes off. Any mood change wakes it. */
const DOZE_MS = 40_000;

function useDozing(mood: CatMood, calm: boolean): CatMood {
  const [dozing, setDozing] = useState(false);
  useEffect(() => {
    setDozing(false);
    if (mood !== "idle" || calm) return;
    const id = window.setTimeout(() => setDozing(true), DOZE_MS);
    return () => window.clearTimeout(id);
  }, [mood, calm]);
  return dozing ? "sleepy" : mood;
}

function Eyes({ mood, calm }: { mood: CatMood; calm: boolean }) {
  if (mood === "happy") {
    return (
      <g stroke={INK} strokeWidth="5" strokeLinecap="round" fill="none">
        <path d="M116 154 Q131 136 146 154" />
        <path d="M174 154 Q189 136 204 154" />
      </g>
    );
  }
  if (mood === "sleepy") {
    return (
      <g stroke={INK} strokeWidth="4.5" strokeLinecap="round" fill="none">
        <path d="M117 152 Q131 162 145 152" />
        <path d="M175 152 Q189 162 203 152" />
      </g>
    );
  }
  const big = mood === "listen";
  const look = mood === "think" ? { x: 5, y: -5 } : { x: 0, y: 0 };
  return (
    <motion.g
      style={{ transformOrigin: "160px 150px" }}
      animate={calm ? { scaleY: 1 } : { scaleY: [1, 1, 0.08, 1] }}
      transition={calm ? undefined : { duration: 4.8, repeat: Infinity, times: [0, 0.92, 0.96, 1], ease: "easeInOut" }}
    >
      <ellipse cx="131" cy="150" rx={big ? 17 : 15} ry={big ? 20 : 17} fill={INK} />
      <ellipse cx="189" cy="150" rx={big ? 17 : 15} ry={big ? 20 : 17} fill={INK} />
      <circle cx={125 + look.x} cy={143 + look.y} r="5" fill="#FFFBF2" />
      <circle cx={183 + look.x} cy={143 + look.y} r="5" fill="#FFFBF2" />
      <circle cx={135 + look.x} cy={157 + look.y} r="2" fill="#FFFBF2" opacity="0.8" />
      <circle cx={193 + look.x} cy={157 + look.y} r="2" fill="#FFFBF2" opacity="0.8" />
      {mood === "oops" ? (
        <g stroke={INK} strokeWidth="3.5" strokeLinecap="round">
          <path d="M116 130 Q128 126 142 120" />
          <path d="M204 130 Q192 126 178 120" />
        </g>
      ) : null}
    </motion.g>
  );
}

function Mouth({ mood, level }: { mood: CatMood; level: number }) {
  if (mood === "talk") {
    return (
      <motion.ellipse
        cx="160"
        cy="194"
        rx="11"
        ry="2"
        fill="#5A2E28"
        initial={{ ry: 2 }}
        animate={{ ry: 2 + level * 9 }}
        transition={{ type: "spring", stiffness: 420, damping: 24 }}
      />
    );
  }
  if (mood === "happy") {
    return <path d="M144 188 Q160 210 176 188 Z" fill="#5A2E28" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />;
  }
  if (mood === "oops") {
    return <path d="M148 196 Q154 190 160 196 Q166 202 172 196" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" />;
  }
  if (mood === "sleepy") {
    return <ellipse cx="160" cy="194" rx="4" ry="3" fill="#5A2E28" />;
  }
  return (
    <path
      d="M146 188 Q153 196 160 188 Q167 196 174 188"
      fill="none"
      stroke={INK}
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}

function Ear({ side, mood, level, calm }: { side: -1 | 1; mood: CatMood; level: number; calm: boolean }) {
  const x = side === -1 ? 116 : 204;
  const outer = side === -1 ? "M120 116 L92 52 Q90 46 96 48 L160 100 Z" : "M200 116 L228 52 Q230 46 224 48 L160 100 Z";
  const inner = side === -1 ? "M122 106 L104 66 L148 100 Z" : "M198 106 L216 66 L172 100 Z";
  let rotate = 0;
  if (mood === "listen") rotate = side * (-12 - level * 14);
  else if (mood === "oops") rotate = side === -1 ? -26 : 4;
  else if (mood === "sleepy") rotate = side * 10;
  else if (mood === "happy") rotate = side * -6;
  else if (mood === "talk") rotate = side * -5;
  return (
    <motion.g
      style={{ transformOrigin: `${x}px 118px` }}
      animate={{ rotate: calm ? 0 : rotate }}
      transition={{ type: "spring", stiffness: mood === "listen" ? 520 : 240, damping: 16 }}
    >
      <path d={outer} fill={FUR} stroke={INK} strokeWidth="4" strokeLinejoin="round" />
      <path d={inner} fill={EAR} />
    </motion.g>
  );
}

function Collar({ season }: { season: Season }) {
  if (season === "spring-festival" || season === "winter") {
    return (
      <g>
        <path d="M100 222 Q160 252 220 222 L222 238 Q160 268 98 238 Z" fill={SEAL} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
        <path d="M196 236 L214 286 L196 280 L186 292 L180 244 Z" fill={SEAL} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
        <g stroke="#F6D58A" strokeWidth="2" opacity="0.9">
          <path d="M112 232 L118 240 M132 238 L138 246 M152 241 L158 249 M172 240 L178 248 M192 236 L198 244" />
        </g>
      </g>
    );
  }
  return (
    <g>
      <path d="M108 222 Q160 246 212 222" fill="none" stroke={SEAL} strokeWidth="9" strokeLinecap="round" />
      <rect x="148" y="232" width="24" height="26" rx="5" fill={JADE} stroke={INK} strokeWidth="2.5" />
      <text x="160" y="251" textAnchor="middle" fontSize="15" fontWeight="700" fill="#F4EFE2" fontFamily="'Echo Serif SC', serif">
        课
      </text>
    </g>
  );
}

function Prop({ season, calm }: { season: Season; calm: boolean }) {
  if (season === "spring-festival") {
    return (
      <motion.g
        style={{ transformOrigin: "272px 40px" }}
        animate={calm ? undefined : { rotate: [-5, 5, -5] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
      >
        <path d="M272 40 V64" stroke={INK} strokeWidth="2" />
        <ellipse cx="272" cy="88" rx="24" ry="26" fill={SEAL} stroke={INK} strokeWidth="3" />
        <path d="M262 64 H282 M262 112 H282" stroke="#E2B24A" strokeWidth="5" strokeLinecap="round" />
        <path d="M272 116 V132 M266 132 L272 140 L278 132" stroke="#E2B24A" strokeWidth="2.5" fill="none" />
        <text x="272" y="96" textAnchor="middle" fontSize="20" fontWeight="700" fill="#F6D58A" fontFamily="'Echo Serif SC', serif">
          福
        </text>
      </motion.g>
    );
  }
  if (season === "mid-autumn") {
    return (
      <g>
        <circle cx="266" cy="70" r="30" fill="#F4D98C" opacity="0.9" />
        <circle cx="256" cy="62" r="5" fill="#E8C66E" />
        <circle cx="276" cy="80" r="4" fill="#E8C66E" />
      </g>
    );
  }
  if (season === "winter") {
    return (
      <g fill="#FFFFFF" opacity="0.85">
        <circle cx="48" cy="70" r="4" />
        <circle cx="270" cy="54" r="3" />
        <circle cx="286" cy="110" r="4" />
        <circle cx="30" cy="130" r="3" />
      </g>
    );
  }
  return null;
}

function MoodMarks({ mood, calm }: { mood: CatMood; calm: boolean }) {
  return (
    <AnimatePresence>
      {mood === "think" ? (
        <motion.g key="think" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          {[0, 1, 2].map((i) => (
            <motion.circle
              key={i}
              cx={232 + i * 16}
              cy={88 - i * 10}
              r={4 + i}
              fill={INK}
              animate={calm ? undefined : { opacity: [0.2, 1, 0.2] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
        </motion.g>
      ) : null}
      {mood === "happy" ? (
        <motion.g
          key="happy"
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          style={{ transformOrigin: "160px 140px" }}
        >
          {[
            [70, 84],
            [252, 74],
            [262, 150],
            [56, 160],
          ].map(([x, y], i) => (
            <motion.path
              key={i}
              d={`M${x} ${y - 10} L${x + 3} ${y - 3} L${x + 10} ${y} L${x + 3} ${y + 3} L${x} ${y + 10} L${x - 3} ${y + 3} L${x - 10} ${y} L${x - 3} ${y - 3} Z`}
              fill={i % 2 ? SEAL : "#E2B24A"}
              animate={calm ? undefined : { scale: [0.7, 1.15, 0.7], rotate: [0, 20, 0] }}
              transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.18 }}
              style={{ transformOrigin: `${x}px ${y}px` }}
            />
          ))}
        </motion.g>
      ) : null}
      {mood === "oops" ? (
        <motion.path
          key="oops"
          d="M226 112 Q218 126 226 132 Q234 126 226 112 Z"
          fill="#8CC3E8"
          stroke={INK}
          strokeWidth="2"
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
        />
      ) : null}
      {mood === "sleepy" ? (
        <motion.g key="zz" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          {[0, 1].map((i) => (
            <motion.text
              key={i}
              x={226 + i * 18}
              y={92 - i * 18}
              fontSize={18 + i * 6}
              fontWeight="700"
              fill={INK}
              fontFamily="Fraunces Variable, Georgia, serif"
              animate={calm ? undefined : { opacity: [0, 1, 0], y: [0, -8, -14] }}
              transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.8 }}
            >
              z
            </motion.text>
          ))}
        </motion.g>
      ) : null}
      {mood === "listen" ? (
        <motion.g key="listen" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} stroke={SEAL} strokeWidth="3.5" fill="none" strokeLinecap="round">
          <motion.path d="M58 120 Q46 150 58 180" animate={calm ? undefined : { opacity: [0.2, 1, 0.2] }} transition={{ duration: 1, repeat: Infinity }} />
          <motion.path d="M262 120 Q274 150 262 180" animate={calm ? undefined : { opacity: [0.2, 1, 0.2] }} transition={{ duration: 1, repeat: Infinity, delay: 0.25 }} />
        </motion.g>
      ) : null}
    </AnimatePresence>
  );
}

function Head({ mood, level, calm, season }: { mood: CatMood; level: number; calm: boolean; season: Season }) {
  const tilt = mood === "think" ? 6 : mood === "oops" ? -5 : mood === "sleepy" ? 8 : 0;
  return (
    <motion.g style={{ transformOrigin: "160px 220px" }} animate={{ rotate: calm ? 0 : tilt }} transition={{ type: "spring", stiffness: 160, damping: 14 }}>
      <Ear side={-1} mood={mood} level={level} calm={calm} />
      <Ear side={1} mood={mood} level={level} calm={calm} />
      <path
        d="M160 82 C214 82 240 118 240 160 C240 206 204 228 160 228 C116 228 80 206 80 160 C80 118 106 82 160 82 Z"
        fill={FUR}
        stroke={INK}
        strokeWidth="4.5"
      />
      <path d="M150 88 Q160 104 170 88" fill="none" stroke={FUR_SHADE} strokeWidth="5" strokeLinecap="round" />
      <path d="M140 92 Q146 104 150 96 M170 96 Q174 104 180 92" fill="none" stroke={FUR_SHADE} strokeWidth="4" strokeLinecap="round" />
      {season === "winter" ? (
        <g>
          <path d="M96 112 Q160 50 224 112 Q160 96 96 112 Z" fill={SEAL} stroke={INK} strokeWidth="3.5" strokeLinejoin="round" />
          <path d="M94 112 Q160 94 226 112" fill="none" stroke="#FFFBF2" strokeWidth="9" strokeLinecap="round" />
          <circle cx="206" cy="64" r="9" fill="#FFFBF2" stroke={INK} strokeWidth="2.5" />
        </g>
      ) : null}
      <Eyes mood={mood} calm={calm} />
      <ellipse cx="112" cy="182" rx="14" ry="8" fill={BLUSH} opacity={mood === "happy" ? 0.7 : 0.35} />
      <ellipse cx="208" cy="182" rx="14" ry="8" fill={BLUSH} opacity={mood === "happy" ? 0.7 : 0.35} />
      <path d="M153 174 L167 174 L160 182 Z" fill="#D9776A" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      <Mouth mood={mood} level={level} />
      <g stroke={INK} strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.75">
        <path d="M100 172 L66 166" />
        <path d="M100 182 L64 184" />
        <path d="M220 172 L254 166" />
        <path d="M220 182 L256 184" />
      </g>
    </motion.g>
  );
}

export function CatFigure({ mood: rawMood, level = 0, variant = "full", season, className, title }: Props) {
  const calm = Boolean(useReducedMotion());
  const mood = useDozing(rawMood, calm);
  const outfit = season ?? seasonFor();
  const bounce = mood === "happy" ? { y: [0, -14, 0] } : mood === "talk" ? { y: [0, -3, 0] } : { y: [0, -4, 0] };
  const bounceTime = mood === "happy" ? 0.55 : mood === "talk" ? 0.42 : mood === "sleepy" ? 5 : 3.4;

  if (variant === "peek") {
    return (
      <motion.svg
        className={className}
        viewBox="40 28 240 246"
        role="img"
        aria-label={title ?? "课猫 Echo"}
        data-mood={mood}
        animate={calm ? undefined : bounce}
        transition={calm ? undefined : { duration: bounceTime, repeat: mood === "happy" ? 2 : Infinity, ease: "easeInOut" }}
      >
        <MoodMarks mood={mood} calm={calm} />
        <Head mood={mood} level={level} calm={calm} season={outfit} />
        <Collar season={outfit} />
        <g fill={FUR} stroke={INK} strokeWidth="4">
          <ellipse cx="118" cy="252" rx="24" ry="14" />
          <ellipse cx="202" cy="252" rx="24" ry="14" />
        </g>
        <g stroke={INK} strokeWidth="2.2" strokeLinecap="round">
          <path d="M110 248 V258 M120 247 V259 M194 248 V258 M204 247 V259" />
        </g>
      </motion.svg>
    );
  }

  return (
    <motion.svg
      className={className}
      viewBox="0 0 320 400"
      role="img"
      aria-label={title ?? "课猫 Echo, an original cat mascot"}
      data-mood={mood}
    >
      <ellipse cx="160" cy="372" rx="96" ry="12" fill="rgba(42,37,32,0.16)" />
      <Prop season={outfit} calm={calm} />
      <motion.g
        animate={calm ? undefined : bounce}
        transition={calm ? undefined : { duration: bounceTime, repeat: mood === "happy" ? 2 : Infinity, ease: "easeInOut" }}
      >
        <motion.path
          d="M214 330 C262 336 296 296 280 246 C268 210 236 204 226 232 C246 240 256 270 232 302 C222 318 214 324 214 330 Z"
          fill={FUR}
          stroke={INK}
          strokeWidth="4"
          strokeLinejoin="round"
          style={{ transformOrigin: "214px 330px" }}
          animate={
            calm
              ? undefined
              : mood === "happy"
                ? { rotate: [-16, 16, -16] }
                : mood === "sleepy"
                  ? { rotate: [-2, 2, -2] }
                  : { rotate: [-9, 10, -9] }
          }
          transition={{ duration: mood === "happy" ? 0.5 : mood === "listen" ? 1.1 : 2.6, repeat: Infinity, ease: "easeInOut" }}
        />
        <path
          d="M160 214 C214 214 240 262 240 300 C240 342 206 362 160 362 C114 362 80 342 80 300 C80 262 106 214 160 214 Z"
          fill={FUR}
          stroke={INK}
          strokeWidth="4.5"
        />
        <path d="M160 250 C186 250 200 280 200 306 C200 334 182 346 160 346 C138 346 120 334 120 306 C120 280 134 250 160 250 Z" fill="#FBF6EC" />
        <g fill={FUR} stroke={INK} strokeWidth="4">
          <motion.ellipse
            cx="122"
            cy="354"
            rx="26"
            ry="14"
            animate={mood === "happy" && !calm ? { y: [0, -54, 0] } : { y: 0 }}
            transition={{ duration: 0.55, repeat: mood === "happy" ? 2 : 0 }}
          />
          <motion.ellipse
            cx="198"
            cy="354"
            rx="26"
            ry="14"
            animate={mood === "happy" && !calm ? { y: [0, -54, 0] } : { y: 0 }}
            transition={{ duration: 0.55, repeat: mood === "happy" ? 2 : 0, delay: 0.08 }}
          />
        </g>
        <g stroke={INK} strokeWidth="2.2" strokeLinecap="round">
          <path d="M114 350 V360 M124 349 V361 M190 350 V360 M200 349 V361" />
        </g>
        <MoodMarks mood={mood} calm={calm} />
        <Head mood={mood} level={level} calm={calm} season={outfit} />
        <Collar season={outfit} />
      </motion.g>
    </motion.svg>
  );
}
