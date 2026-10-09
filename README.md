# 课猫 Echo

Practice English or Chinese. The top toggle switches language and is remembered in this browser. Each pack has 100 sentences: the line you say is large, and the meaning sits underneath.

Hear it speaks the sentence. Say it listens, then marks the words you matched in English or the 字 you matched in Chinese. The score is a count, not an accent percentage.

The cat is an original mascot. Not Talking Tom, and not Talking Tat.

Live site: https://dsarangi7.github.io/Echo/

## How speech works

No paid API keys. Nothing is sent to Google Cloud, Azure, or OpenAI.

**Say it** runs quantized Whisper tiny in the browser with [`@xenova/transformers`](https://www.npmjs.com/package/@xenova/transformers) (ONNX, WebAssembly, one thread). The happy path does not call `webkitSpeechRecognition` or any other Google speech recognizer. The weights ship with this site under `public/models/Xenova/whisper-tiny/`. Say it does not download them from Hugging Face or hf-mirror.

- Vendored size is **about 44 MB**: quantized encoder `10,124,910` bytes, quantized merged decoder `30,727,765` bytes, plus tokenizer files (`tokenizer.json` is `2,480,466` bytes). That is the GitHub Pages payload for the model. The decoder stays under GitHub’s 50 MB file warning.
- Hear it does not wait for that download. The status line starts with **Hear it is ready.** The model fetch begins when you tap **Say it**, then the line shows **Downloading Say it voice model…** and a percent.
- Transformers.js loads those files from this origin (`/Echo/models/...` on GitHub Pages) and stores them in the **Cache API** (`transformers-cache`). The next Say it reuses that cache, including after you install the app. Remote model hosts are disabled (`allowRemoteModels` is false).
- The service worker does not precache the ONNX files. The decoder is about 29 MB, above the 12 MB precache cap, so a phone is not forced to download the model just to install the app.
- The ONNX runtime is a single WASM thread, so GitHub Pages does not need cross-origin isolation. That is what lets Safari load it. The build copies `ort-wasm-simd.wasm` and `ort-wasm.wasm` (about 10 MB together) into the site.
- Whisper tiny is the small multilingual model, on purpose, so phones can hold it. It will miss words, especially in Chinese. Misses are missing words or 字, not a fake accent score.
- If the copy on this site cannot be loaded, the status line says so in English and 中文 and says that Hear it still plays. Refresh and tap Say it to try again.

**Hear it** plays a small pack of MP3s, about **2 MB for all 200 lines**. They were made with free [Piper](https://github.com/rhasspy/piper) voices:

- English: `en_US-lessac-medium` (female, US)
- 中文: `zh_CN-huayan-medium` (female, Mandarin)

Any browser that can play MP3 can speak the lines, including Safari, Edge, Chrome, and Firefox, on desktop and on a phone. The clips are a little slower than conversation (`length_scale` 1.05) so a class can hear each word.

The clip plays from the same tap that hit Hear it (`playsInline`, `preload="auto"`). On iOS the page asks for playback audio so the ringer switch does not mute it. If the clip does not start, Hear it tries the device `speechSynthesis` voice and prefers a sweet female voice when the system has one (Samantha, Aria, Jenny, Tingting, Xiaoxiao, and the other names in `src/practice/voices.ts`). That fallback is free and uses whatever the browser already has. It is not required for the 200 built-in sentences. If the clip and the device voice both fail, the page says so in English and 中文 instead of leaving the cat idle and silent. Hear it never needs the Whisper model.

Piper is not run as WASM inside the page. A live Piper voice is about 60 MB per language, and it would be a second ONNX runtime next to Whisper. The same free voices, saved as 40 kbps MP3, stay small and play everywhere.

To rebuild the clips after a sentence edit, install Piper and ffmpeg, then run `scripts/generate-audio.py`. The model files stay outside the repo.

## Browsers

| | Hear it | Say it |
| --- | --- | --- |
| Chrome, Edge (desktop and Android) | MP3 pack | On-device Whisper |
| Safari (macOS, iOS 16.4+) | MP3 pack | On-device Whisper, mic permission required |
| Firefox | MP3 pack | On-device Whisper |
| Very old browsers without WebAssembly | MP3 pack still plays | The page stays up and explains that the voice model cannot start |

Say it needs a microphone and a user gesture. Install the PWA or open the HTTPS site; a file:// page cannot use the mic.

The first Say it needs a network once, for the 44 MB weights on this site. After that, recognition is on the device (Cache API). Hear it is offline as soon as the app shell and MP3s are cached, even if the voice model never loads.

## Install (PWA)

The built site includes a web manifest and a service worker. On GitHub Pages (HTTPS) colleagues can install it:

- Chrome or Edge on desktop: the install icon in the address bar, or the browser menu.
- Android Chrome or Edge: menu → Install app, or Add to Home screen.
- iPhone or iPad Safari: Share → Add to Home Screen.
- Mac Safari: File → Add to Dock, or Share → Add to Dock.

`start_url` and `scope` are `/Echo/`. Theme color is the same dark background as the page.

## Run

```bash
npm install
npm run dev
```

Then open the local URL Vite prints (the dev server includes the `/Echo/` base). `npm run dev` copies the ONNX wasm into `public/onnx/` and starts the app with hot reload.

```bash
npm test
npm run build
npm run preview
```

`npm test` checks scoring, the Hear it order, the voice-model wording, and that the source does not call Web Speech Recognition.

`npm run build` copies the wasm, typechecks, and writes a static site to `dist/`. `npm run preview` serves that build.

## GitHub Pages

`.github/workflows/pages.yml` runs on every push to `main`. It installs with `npm ci`, builds with `npm run build`, and deploys `dist/` with GitHub Pages from Actions. Vite `base` is `/Echo/`, so JS, CSS, icons, audio, and the favicon load under that path.

One-time repository setting (required before the first deploy succeeds):

**Settings → Pages → Build and deployment → Source: GitHub Actions**

After that, the workflow on `main` publishes the site. Re-run **Deploy GitHub Pages** from the Actions tab if a deploy failed before Pages was switched to GitHub Actions.
