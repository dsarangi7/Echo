# 课猫 Echo

Practice English or Chinese. The top toggle switches language and is remembered in this browser. Each pack has 100 sentences: the line you say is large, and the meaning sits underneath.

English practice stays in the office: meetings, email, the factory, quality, and order documents. Chinese practice is for AYK work — orders, invoices, shipping documents, minutes, HR notices, drawings — plus Meituan delivery and Didi taxi rides.

Hear it speaks the sentence. Say it listens, then marks the words you matched in English or the 字 you matched in Chinese. The score is a count, not an accent percentage.

The cat is an original mascot. Not Talking Tom, and not Talking Tat.

Live sites:

- GitHub Pages: https://dsarangi7.github.io/Echo/ (base `/Echo/`)
- Vercel: https://echo-psi-ashen.vercel.app and other `*.vercel.app` hosts (base `/`)

## How speech works

No paid API keys. Nothing is sent to Google Cloud, Azure, or OpenAI.

**Say it** runs quantized Whisper tiny in the browser with [`@xenova/transformers`](https://www.npmjs.com/package/@xenova/transformers) (ONNX, WebAssembly, one thread). The happy path does not call `webkitSpeechRecognition` or any other Google speech recognizer. The weights ship with this site under `public/models/Xenova/whisper-tiny/`. Say it does not download them from Hugging Face or hf-mirror.

- Vendored size is **about 44 MB**: quantized encoder `10,124,910` bytes, quantized merged decoder `30,727,765` bytes, plus tokenizer files (`tokenizer.json` is `2,480,466` bytes). That is the GitHub Pages payload for the model. The decoder stays under GitHub’s 50 MB file warning.
- Hear it does not wait for that download. The page starts loading the model immediately and the status line says **Wait a moment — downloading the voice model…** (and the same in 中文) until it is ready, with a percent when the sizes are known. You can still tap **Hear it** while that runs.
- Transformers.js loads those files from this origin (`/Echo/models/...` on GitHub Pages, `/models/...` on Vercel) and stores them in the **Cache API** (`transformers-cache`). The next Say it reuses that cache, including after you install the app. Remote model hosts are disabled (`allowRemoteModels` is false).
- The service worker does not precache the ONNX files. The decoder is about 29 MB, above the 12 MB precache cap, so a phone is not forced to download the model just to install the app.
- The ONNX runtime is a single WASM thread, so GitHub Pages does not need cross-origin isolation. That is what lets Safari load it. The build copies `ort-wasm-simd.wasm` and `ort-wasm.wasm` (about 10 MB together) into the site.
- Whisper tiny is the small multilingual model, on purpose, so phones can hold it. It will miss words, especially in Chinese. Misses are missing words or 字, not a fake accent score.
- If the copy on this site cannot be loaded, the status line says so in English and 中文 and says that Hear it still plays. Refresh and tap Say it to try again.

**Hear it** plays a small pack of MP3s, about **2 MB for all 200 lines**. They were made with free [Piper](https://github.com/rhasspy/piper) voices:

- English: `en_US-lessac-medium` (female, US)
- 中文: `zh_CN-huayan-medium` (female, Mandarin)

Any browser that can play MP3 can speak the lines, including Safari, Edge, Chrome, and Firefox, on desktop and on a phone. The clips are a little slower than conversation (`length_scale` 1.05) so a class can hear each word.

**Hear it pace** sits above the buttons: Slow / 慢, Normal / 正常, Fast / 快. It changes `playbackRate` and keeps pitch (`preservesPitch`). The choice is saved per language in this browser (`echo-hear-pace`), so slowing 中文 does not slow English. English starts on Normal, which is the clip’s own speed (`1`). 中文 starts on Slow, `0.75` — 25% lower rate, about 33% longer — so the Mandarin line is easier to shadow. Fast is `1.25`. The same pace is used for the cat’s introduction and, if the clip cannot play, for the device voice (its Normal rate stays `0.92`, multiplied by the pace). The Piper files themselves are unchanged.

On open, the cat says a short introduction in the current language (English in English mode, 中文 in 中文 mode). Tap the cat or the Echo nameplate to hear it again. Switching language speaks that introduction in the new language. The introduction is a Piper clip, same as Hear it, and it does not wait for the Say it model.

The clip plays from the same tap that hit Hear it (`playsInline`, `preload="auto"`). On iOS the page asks for playback audio so the ringer switch does not mute it. Say it switches that session to `play-and-record` before it opens the microphone, so the playback session does not block recording. The next Hear it sets playback again. If the clip does not start, Hear it tries the device `speechSynthesis` voice and prefers a sweet female voice when the system has one (Samantha, Aria, Jenny, Tingting, Xiaoxiao, and the other names in `src/practice/voices.ts`). That fallback is free and uses whatever the browser already has. It is not required for the 200 built-in sentences. If the clip and the device voice both fail, the page names the reason in English and 中文, and leaves the cat idle only after that note: the sound file is missing, playback was blocked, this line’s audio is still loading, or the device voice could not speak. That note does not say Hear it needs the voice model, and it does not say Hear it does not need it, so it does not clash with the Say it download line. Hear it still never uses the Whisper model.

Piper is not run as WASM inside the page. A live Piper voice is about 60 MB per language, and it would be a second ONNX runtime next to Whisper. The same free voices, saved as 40 kbps MP3, stay small and play everywhere.

To rebuild the clips after a sentence edit, install Piper and ffmpeg, then run `scripts/generate-audio.py`. The model files stay outside the repo.

## Browsers

| | Hear it | Say it |
| --- | --- | --- |
| Chrome, Edge (desktop and Android) | MP3 pack | On-device Whisper |
| Safari (macOS, iOS 16.4+) | MP3 pack | On-device Whisper, mic permission required |
| Firefox | MP3 pack | On-device Whisper |
| Very old browsers without WebAssembly | MP3 pack still plays | The page stays up and explains that the voice model cannot start |

Say it needs a microphone and a user gesture on an HTTPS page. A file:// page cannot use the mic. The Say it tap calls `getUserMedia({ audio: true })` and `AudioContext.resume()` in that same turn, before it waits on anything. A phone that blocks the mic, has no input, or fails for another reason gets a different bilingual note: allow the microphone in the browser settings, no microphone on this device, or could not open it. The site does not send a Permissions-Policy that disables `microphone`.

The first visit needs a network once, for the 44 MB weights on this site. After that, recognition is on the device (Cache API). Hear it is offline as soon as the app shell and MP3s are cached, even if the voice model never loads.

### Phone check

Unit tests cover the tap order and the denied / no-mic / failed split. A real phone still needs a manual pass after deploy:

1. Open https://dsarangi7.github.io/Echo/ in Safari (iPhone) or Chrome (Android). The page must be HTTPS.
2. Tap **Say it**. The browser should prompt for the microphone, or use a permission you already allowed. It should not say “No microphone on this device / 这台设备没有麦克风” on a phone that has a mic.
3. Say the sentence, then tap **Say it** again or wait for the pause. The transcript stays on this device (Whisper tiny).
4. Block the microphone in the browser settings, tap **Say it** again, and confirm the note tells you to allow the microphone in the browser settings. That note is not the “no microphone” line.
5. If an in-app browser (WeChat) never shows the prompt, open the same HTTPS link in Safari or Chrome and allow the microphone there.

## Install (PWA)

The built site includes a web manifest and a service worker. On GitHub Pages (HTTPS) colleagues can install it:

- Chrome or Edge on desktop: the install icon in the address bar, or the browser menu.
- Android Chrome or Edge: menu → Install app, or Add to Home screen.
- iPhone or iPad Safari: Share → Add to Home Screen.
- Mac Safari: File → Add to Dock, or Share → Add to Dock.

`start_url` and `scope` follow the Vite base (`/Echo/` on GitHub Pages, `/` on Vercel). Theme color is the same dark background as the page.

The Android app is a separate install. It wraps this build and delivers a daily reminder plus a Monday streak summary while the app is closed, at the phone's own clock time. The practice streak is still counted in Asia/Shanghai. It reads the same `echo-practice-streak` and `echo-practice-reminder` records as the site. Build steps and the `com.ayk.echo` id are in [docs/android.md](docs/android.md).

## Run

```bash
npm install
npm run dev
```

Then open the local URL Vite prints. The dev server uses the `/Echo/` base unless `VITE_BASE`, `BASE_PATH`, or `VERCEL` is set. `npm run dev` copies the ONNX wasm into `public/onnx/` and starts the app with hot reload.

```bash
npm test
npm run build
npm run preview
```

`npm test` checks scoring, the Hear it order, the sentence packs, the voice-model wording, the Say it microphone errors, the deploy base (`/Echo/` or `/`), the Shanghai streak, the reminder copy, the Android reminder plan, and that the source does not call Web Speech Recognition.

`npm run build` copies the wasm, typechecks, and writes a static site to `dist/`. `npm run preview` serves that build.

## GitHub Pages

`.github/workflows/pages.yml` runs on every push to `main`. It installs with `npm ci`, builds with `npm run build`, and deploys `dist/` with GitHub Pages from Actions. That workflow sets `VITE_BASE=/Echo/`, so JS, CSS, icons, audio, and the favicon load under that path.

One-time repository setting (required before the first deploy succeeds):

**Settings → Pages → Build and deployment → Source: GitHub Actions**

After that, the workflow on `main` publishes the site. Re-run **Deploy GitHub Pages** from the Actions tab if a deploy failed before Pages was switched to GitHub Actions.

## Vercel

The same codebase deploys to Vercel at the site root. `vercel.json` rewrites unknown paths to `index.html` so a refresh still loads the app. Files that exist in `dist/` (JS, CSS, audio, models, the service worker) are served as themselves.

Vite chooses `base` in this order:

1. `VITE_BASE`, if it is set
2. `BASE_PATH`, if it is set
3. `/` when `CAPACITOR` or `VITE_CAPACITOR` is set (the Android release build)
4. `/` when `VERCEL` is set (Vercel sets this on production and preview builds)
5. `/Echo/` otherwise (local `npm run dev` and `npm run build`)

Set `VITE_BASE=/` in the Vercel project environment if you want the root base to be explicit. Leaving it unset is enough, because `VERCEL` selects `/`. Do not set `VITE_BASE=/Echo/` on Vercel. The PWA `start_url` and `scope` use that same base, so a Vercel build requests `/assets/...`, `/audio/...`, and `/models/...`.

To check the root build locally:

```bash
VITE_BASE=/ npm run build
npm run preview
```

`VERCEL=1 npm run build` is the same root base Vercel produces when `VITE_BASE` is unset.
