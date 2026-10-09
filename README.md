# 课猫 Echo

Practice English or Chinese. The top toggle switches language and is remembered in this browser. Each pack has 100 sentences: the line you say is large, and the meaning sits underneath.

Open the app in Chrome. Hear it and Say it use the matching language (`en-US` or `zh-CN`), with a preference for a sweet female voice. The score counts words in English and 字 in Chinese. It is not an accent percentage.

The cat is an original mascot. Not Talking Tom, and not Talking Tat.

## Run

```bash
npm install
npm run dev
```

Then open the local URL Vite prints. `npm run dev` starts the app with hot reload.

```bash
npm run build
npm run preview
```

`npm run build` typechecks and writes a static site to `dist/`. `npm run preview` serves that build.

Say it needs Chrome and a microphone. Other browsers can still show the sentences and play Hear it when speech synthesis is available.

## GitHub Pages

`.github/workflows/pages.yml` publishes `dist/` from `main`. Vite uses a relative asset base, so the site can live at `https://<user>.github.io/Echo/` without a hardcoded path.

In the repository settings, set Pages to GitHub Actions.
