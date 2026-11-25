# AGENTS.md — 课猫 Echo

Handover notes for any coding agent working on this repo. Read this first, then `README.md`.

## What the app is

课猫 Echo is a free speaking-practice app for **English and Chinese**, built for people living and working in China (office/factory English; Chinese for work documents, Didi, Meituan, shopping, tea house, supermarket). One sentence card at a time: **Hear it** plays a recorded clip, **Say it** records the learner and marks matched words (English) or pinyin syllables (Chinese). Scoring is a count of matches, never an accent percentage. A **Translate** tab translates EN↔中文.

- Owner's goal: a polished **Google Play** app (closed testing first), and later Chinese Android stores.
- Package `com.ayk.echo`. Current version **1.1.0 / versionCode 8**.
- Live web: GitHub Pages `https://dsarangi7.github.io/Echo/` (base `/Echo/`, deploys from `main` only) and Vercel `https://echo-psi-ashen.vercel.app` (base `/`; previews per branch).

## Stack

- React 19 + TypeScript + Vite 7, framer-motion for animation.
- Speech recognition: **Whisper in the browser** via `@xenova/transformers` (ONNX, WASM, 1 thread). No cloud APIs, no keys. Weights are vendored under `public/models/Xenova/`.
- Hear it: pre-generated Piper MP3s in `public/audio/{en,zh}/NNN.mp3` (`scripts/generate-audio.py`).
- Android: Capacitor 8 shell in `android/` (local notifications, haptics).
- Tests: Vitest (`tests/`), ~189 tests. PWA via vite-plugin-pwa (web only, not in the Capacitor build).

## Commands

```bash
npm ci
npm run dev            # http://localhost:5173/Echo/
npm test               # vitest run — must stay green
npm run build          # web build (Whisper tiny only)
CAPACITOR=1 npm run build && npx cap sync android   # app build (tiny + base)
npm run android:bundle # signed AAB — needs Android SDK + the owner's `echo` keystore (owner's machine only)
npm run fonts          # re-subset Chinese serif font after editing sentence text
npm run pinyin         # regenerate `py` pinyin in pack-zh.json after editing sentences
node scripts/make-brand-art.cjs   # regenerate icons, splash, Play graphics (uses Playwright)
```

## Map of the code

| Area | Files |
| --- | --- |
| App shell, top tabs | `src/App.tsx`, `src/components/ModeNav.tsx` |
| Practice screen | `src/components/PracticePanel.tsx`, `FlashCard.tsx`, `TargetSentence.tsx`, `PackPicker.tsx` |
| Practice state / Say it flow | `src/practice/usePractice.ts` |
| Scoring | `src/practice/score.ts`, `src/practice/zhSound.ts`, `src/data/t2s.json` |
| Speech model | `src/speech/model.ts`, `stt.ts`, `whisper.worker.ts`, `whisper-prompt.ts` |
| Cat character | `src/components/CatFigure.tsx` (drawing + moods), `CatMascot.tsx` (landing), `src/ui/season.ts` |
| Stamp / sound / haptics | `src/components/SealStamp.tsx`, `src/ui/feedback.ts` |
| Settings & prefs | `src/components/SettingsSheet.tsx`, `src/ui/prefs.ts`, `src/ui/theme.ts` |
| Styles | `src/index.css` (base, older), `src/design.css` (1.1.0 design layer, loaded last), `src/fonts.css` (generated) |
| Sentence data | `src/data/pack-en.json`, `pack-zh.json` (`zh`, `py`, `en`, `set`, `zhSet`), `intro.json` |
| Android | `android/`, `capacitor.config.ts`, `docs/android.md` |
| Play Store | `docs/play-store-listing.md`, `docs/closed-testing-1.1.0.md`, `docs/play-store/` |

## Change log of this work (branch `claude/laughing-goldberg-u65ul2`, not yet merged to `main`)

### Commit 1 — "Redesign 1.1.0" (`116a887`)

**Design — "ink on rice paper, one red seal"**
- New tokens in `src/design.css` (light = rice paper `#f4eee2` + ink `#1f1b16`; dark = ink-stone `#15130f` + paper text). Seal red `#c8372d` is the brand accent; jade `#2f7d5b` = matched. `--neon` was re-pointed to ink/paper, so old `index.css` rules follow the new palette.
- Paper grain texture, notebook ruled margin on cards, spring card transitions, breathing red Say it while recording.
- Self-hosted fonts (Google Fonts is blocked in mainland China): Fraunces (Latin display) + a **subset** of Noto Serif SC 600 (`scripts/build-fonts.mjs` keeps only the unicode slices our text uses, ~742 KB, into `src/assets/fonts/`).
- Header logo: red seal 课猫 + "Echo" wordmark.
- Matched / missed are now underlines (green solid / red wavy) instead of filled chips.
- Optional **tone colors** on pinyin (1 red, 2 amber, 3 jade, 4 indigo) via `data-t` on syllables + `html[data-tones]`.

**Cat as a real character** (`CatFigure.tsx`)
- Moods: idle, listen (ears react to mic level, sound arcs), talk (mouth follows audio), think (… while transcribing), happy (closed eyes, sparkles, jump), oops (worried brows, sweat drop), sleepy (dozes after 40 s idle).
- Seasonal outfits from the Asia/Shanghai calendar: Spring Festival scarf + 福 lantern, Mid-Autumn moon, winter hat.
- A small "peek" cat sits on top of the practice card; tapping it plays the line.

**Reward**
- 很好 square seal (Clear) / 加油 round seal (Partial) stamps onto the card with a synthesized thud + haptic (`@capacitor/haptics` on Android, `navigator.vibrate` on web). Paper-flip sound on card change. Settings → "Sounds & vibration" turns it all off.

**Speech accuracy**
- Big finding: Whisper writes **traditional** characters and picks **homophones**, which were scored as misses. `score.ts` now folds both sides to simplified (OpenCC char table) and matches toneless pinyin readings (pinyin-pro, lazy-loaded on first Chinese Say it). On the bundled clips Whisper tiny went **~60% → 91%** of syllables.
- Android app also bundles **Whisper base** (~77 MB) as default "Accurate" (93%, ~1.5× slower). Settings → Voice model: Accurate / Fast. If one Accurate transcription takes >8 s, a one-time hint offers Fast.
- The **website ships tiny only**: `vite.config.ts` plugin `pruneModels` deletes `dist/models/Xenova/whisper-base` unless `CAPACITOR=1`. `import.meta.env.VITE_ECHO_ACCURATE` is defined as `"1"` only for the app build.

**Android / Play**
- New adaptive launcher icon (cat in red seal) incl. monochrome (themed icons), round icon, splash (paper), Android 12 splash attributes, notification color → seal red.
- Web icons, favicon, Play hi-res icon, feature graphic, phone screenshots (1080×2160) regenerated.
- versionCode 8 / versionName 1.1.0. `docs/closed-testing-1.1.0.md`: build steps, release notes (EN/中文), tester checklist. New personal Play accounts need **12 testers opted in for 14 consecutive days** before production.

### Commit 2 — "Hide Word decks" (`fa59ea2`)
- Top tabs are now **Practice first, Translate second**. Word decks are hidden with `SHOW_WORD_DECKS = false` in `src/App.tsx` (code kept; flip to `true` to restore). A saved "words" mode falls back to Practice.
- Play screenshots/listing/release notes updated to match.

### Commit 3 — AGENTS.md (`06b73b4`)

### Commit 4 — "Try again" voice
- Clear line → the existing success chime (`public/assets/victory.wav`, `playVictory`).
- Partial / miss / unclear line → after 450 ms a spoken encouragement in the learner's **other** language (`playEncourage` in `src/speech/victory.ts`): English learners hear 中文 "没关系，我们再试一次。" (`public/audio/encourage/zh.mp3`); Chinese learners hear "Good try! Let's try again." (`public/audio/encourage/en.mp3`). Piper voices `zh_CN-huayan-medium` / `en_US-lessac-medium`, length scale 1.05. Muted when Settings → Sounds & vibration is off.

## Rules and gotchas

- **Keep `npm test` green.** Many tests read source files as strings (e.g. element ids like `#cat-intro`, `#say`, `#hear`, `#landing-start`, attribute order in rendered HTML). Don't rename ids casually.
- **No cloud speech or remote model hosts.** Tests forbid `SpeechRecognition` and `huggingface.co` in `src/speech`. `allowRemoteModels` stays false.
- Don't put the Whisper ONNX files in the service-worker precache (12 MB cap).
- Chinese cards show **pinyin** (`py`); Hear it / Say it use the characters (`zh`). After editing sentences run `npm run pinyin` and `npm run fonts`.
- Any new Chinese UI text needs `npm run fonts` or it falls back to the system serif.
- Respect `prefers-reduced-motion` (the cat and cards already do).
- Android notification channel is `echo-practice-v2`; Android can't change a channel's sound after creation — use a new channel id if you change it.
- Never use `USE_EXACT_ALARM` (Play rejects it for this kind of app); the reminder uses `SCHEDULE_EXACT_ALARM`.
- Signing keystore and passwords are **not** in the repo; release builds happen on the owner's machine.
- Commit/branch: work on a feature branch; `main` deploys GitHub Pages.

## Open items / next ideas

1. Merge `claude/laughing-goldberg-u65ul2` → `main`, build the signed AAB, start the Play closed test.
2. Measure Say it speed on real (older) phones; if Whisper base is often >8 s, make Fast the default.
3. Real-voice accuracy check (benchmarks used the app's own TTS clips).
4. Content: more daily-life China packs (hospital 挂号, renting/押金, delivery locker 取件码, bank card, 12306 trains, phone top-up).
5. Domestic Android stores (Huawei, Xiaomi, OPPO, vivo, 应用宝) need APP备案 and usually 软著.
6. Ideas not yet built: home-screen widget, share-a-card image with QR for WeChat, Rive/Lottie cat animations by an illustrator.
