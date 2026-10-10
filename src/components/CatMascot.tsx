import { motion, useReducedMotion } from "framer-motion";
import type { CatMode } from "../practice/types";

type Props = {
  mode: CatMode;
  mouth: number;
  onIntroduce: () => void;
};

const MODE_LABEL: Record<CatMode, string> = {
  idle: "待命 · idle",
  listen: "在听 · listening",
  talk: "在说 · speaking",
};

export function CatMascot({ mode, mouth, onIntroduce }: Props) {
  const reduce = useReducedMotion();
  const calm = Boolean(reduce);
  const listening = mode === "listen";
  const talking = mode === "talk";

  return (
    <section className={`card cat-card ${mode}`} id="cat-card">
      <div className="stage-light" aria-hidden="true" />
      <button type="button" className="cat-hit" id="cat-intro" onClick={onIntroduce} aria-label="Play Echo's introduction. 播放课猫的自我介绍。">
      <motion.svg
        className="cat-svg"
        viewBox="0 0 320 400"
        role="img"
        aria-label="课猫 Echo, an original cat mascot"
        animate={calm ? { y: 0 } : { y: [0, -4, 0] }}
        transition={calm ? undefined : { duration: talking ? 0.42 : 3.4, repeat: Infinity, ease: "easeInOut" }}
      >
        <ellipse cx="160" cy="362" rx="92" ry="14" fill="rgba(0,0,0,0.45)" />
        <motion.ellipse
          cx="160"
          cy="210"
          rx="118"
          ry="132"
          fill="none"
          stroke="#C8FF3D"
          strokeWidth="2"
          animate={{ opacity: listening ? 0.8 : talking ? 0.28 : 0, scale: listening ? 1.03 : 1 }}
          transition={{ duration: 0.35 }}
        />

        <motion.path
          d="M196 268 C244 274 286 236 270 184 C258 146 226 140 214 168 C236 176 248 206 220 242 C206 262 198 266 196 268 Z"
          fill="#C9C2B4"
          style={{ transformOrigin: "196px 268px" }}
          animate={
            calm
              ? { rotate: 0 }
              : listening
                ? { rotate: [-6, 8, -6] }
                : { rotate: [-12, 14, -12] }
          }
          transition={calm ? undefined : { duration: listening ? 1.1 : 2.4, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.path
          d="M214 176 C228 158 246 156 256 172"
          fill="none"
          stroke="#E7E1D6"
          strokeWidth="6"
          strokeLinecap="round"
          style={{ transformOrigin: "196px 268px" }}
          animate={calm ? { rotate: 0 } : listening ? { rotate: [-6, 8, -6] } : { rotate: [-12, 14, -12] }}
          transition={calm ? undefined : { duration: listening ? 1.1 : 2.4, repeat: Infinity, ease: "easeInOut" }}
        />

        <motion.g
          animate={calm ? { scaleY: 1 } : { scaleY: [1, 1.018, 1] }}
          transition={calm ? undefined : { duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
          style={{ transformOrigin: "160px 250px" }}
        >
          <ellipse cx="160" cy="268" rx="78" ry="84" fill="#E4DDD1" />
          <ellipse cx="160" cy="286" rx="46" ry="54" fill="#F7F4EE" />
          <ellipse cx="124" cy="338" rx="26" ry="15" fill="#E4DDD1" />
          <ellipse cx="196" cy="338" rx="26" ry="15" fill="#E4DDD1" />
          <path d="M112 336 H136 M184 336 H208" stroke="#A79F92" strokeWidth="1.4" strokeLinecap="round" />

          <motion.g
            style={{ transformOrigin: "116px 118px" }}
            animate={{ rotate: calm ? 0 : listening ? -16 : talking ? -7 : 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 18 }}
          >
            <path d="M118 150 L86 58 L164 112 Z" fill="#E4DDD1" />
            <path d="M120 140 L102 78 L152 116 Z" fill="#E7B4AC" />
            {listening && <circle cx="96" cy="72" r="5" fill="#C8FF3D" />}
          </motion.g>
          <motion.g
            style={{ transformOrigin: "204px 118px" }}
            animate={{ rotate: calm ? 0 : listening ? 16 : talking ? 7 : 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 18 }}
          >
            <path d="M202 150 L234 58 L156 112 Z" fill="#E4DDD1" />
            <path d="M200 140 L218 78 L168 116 Z" fill="#E7B4AC" />
            {listening && <circle cx="224" cy="72" r="5" fill="#C8FF3D" />}
          </motion.g>

          <circle cx="160" cy="156" r="72" fill="#E7E1D6" />
          <ellipse cx="160" cy="176" rx="64" ry="52" fill="#E7E1D6" />

          <motion.g
            style={{ transformOrigin: "160px 150px" }}
            animate={calm ? { scaleY: 1 } : { scaleY: [1, 1, 0.08, 1] }}
            transition={calm ? undefined : { duration: 4.6, repeat: Infinity, times: [0, 0.9, 0.95, 1], ease: "easeInOut" }}
          >
            <ellipse cx="132" cy="150" rx="16" ry={listening ? 18 : 17} fill="#1C1C1C" />
            <ellipse cx="188" cy="150" rx="16" ry={listening ? 18 : 17} fill="#1C1C1C" />
            <circle cx="126" cy="144" r="4.2" fill="#F7F7F4" />
            <circle cx="182" cy="144" r="4.2" fill="#F7F7F4" />
          </motion.g>

          <path d="M154 174 L160 182 L166 174 Q160 178 154 174 Z" fill="#C9847A" />
          <motion.ellipse
            cx="160"
            cy="196"
            rx="14"
            fill="#3C2C2A"
            animate={{ ry: 1.2 + mouth * 10, opacity: mouth > 0.2 ? 1 : 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 24 }}
          />
          <motion.path
            d="M142 190 Q160 202 178 190"
            fill="none"
            stroke="#6E625C"
            strokeWidth="2.4"
            strokeLinecap="round"
            animate={{ opacity: mouth > 0.35 ? 0 : 1 }}
          />

          <g stroke="#8A8278" strokeWidth="1.3" strokeLinecap="round" fill="none">
            <path d="M108 168 H78" />
            <path d="M110 178 H74" />
            <path d="M112 188 H82" />
            <path d="M212 168 H242" />
            <path d="M210 178 H246" />
            <path d="M208 188 H238" />
          </g>

          <path d="M112 214 H208" stroke="#C8FF3D" strokeWidth="8" strokeLinecap="round" />
          <circle cx="160" cy="228" r="8" fill="#F4F4F1" stroke="#C8FF3D" strokeWidth="2" />
        </motion.g>
      </motion.svg>
      <div className="nameplate">
        <strong>课猫 Echo</strong>
        <span id="mode">{MODE_LABEL[mode]}</span>
      </div>
      </button>
    </section>
  );
}
