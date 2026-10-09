# 课猫 Echo

Practice English or Chinese. The top toggle switches language and is remembered in this browser. Each pack has 100 sentences: the line you say is large, and the meaning sits underneath.

English practice stays in the office (meetings, email, the factory, quality, orders and documents). Chinese practice is for AYK work — orders, invoices, shipping documents, minutes, HR notices, drawings — plus Meituan delivery. A short everyday slice is at the end.

Open the app in Chrome. Hear it plays the bundled Piper clip for that line. Say it uses Chrome speech recognition in the matching language (`en-US` or `zh-CN`). The score counts words in English and 字 in Chinese. It is not an accent percentage.

The cat is an original mascot. Not Talking Tom, and not Talking Tat.

## Run

```bash
npm install
npm run dev
```

Then open the local URL Vite prints (the dev server includes the `/Echo/` base). `npm run dev` starts the app with hot reload.

```bash
npm run build
npm run preview
```

`npm run build` typechecks and writes a static site to `dist/`. `npm run preview` serves that build.

Say it needs Chrome and a microphone. Other browsers can still show the sentences and play Hear it from the bundled clips.

## Hear it audio

Clips live in `public/audio/en/` and `public/audio/zh/` as `000.mp3` through `099.mp3`. The number is the sentence index in that pack. `public/audio/manifest.json` stores a sha256 of the spoken line (`en` in the English pack, `zh` in the Chinese pack). `npm test` fails if a clip is missing or still matches an old line.

Hear it tries that file first. If it cannot play, the app falls back to the browser voice.

Regenerate after editing a pack. This needs Python 3, [piper-tts](https://github.com/OHF-Voice/piper1-gpl), ffmpeg, and the voice files (downloaded into `.piper-voices/` on first run, not committed):

- English: `en_US-lessac-medium` (US, female)
- Mandarin: `zh_CN-huayan-medium` (female)

```bash
python3 -m venv .venv
.venv/bin/pip install piper-tts
.venv/bin/python scripts/build-piper-audio.py
```

The script speaks a little slower than the model default (`length_scale` 1.06) and writes 64 kbps mono MP3s. Unchanged lines are skipped when the manifest hash still matches.

## GitHub Pages

Live site: https://dsarangi7.github.io/Echo/

`.github/workflows/pages.yml` runs on every push to `main`. It installs with `npm ci`, builds with `npm run build`, and deploys `dist/` with GitHub Pages from Actions. Vite `base` is `/Echo/`, so JS, CSS, and the favicon load under that path.

One-time repository setting (required before the first deploy succeeds):

**Settings → Pages → Build and deployment → Source: GitHub Actions**

After that, the workflow on `main` publishes the site. Re-run **Deploy GitHub Pages** from the Actions tab if a deploy failed before Pages was switched to GitHub Actions.
