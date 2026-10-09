# 课猫 Echo

Practice English or Chinese. The top toggle switches language and is remembered in this browser. Each pack has 100 sentences: the line you say is large, and the meaning sits underneath.

Open the app in Chrome. Hear it and Say it use the matching language (`en-US` or `zh-CN`), with a preference for a sweet female voice. The score counts words in English and 字 in Chinese. It is not an accent percentage.

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

Say it needs Chrome and a microphone. Other browsers can still show the sentences and play Hear it when speech synthesis is available.

## GitHub Pages

Live site: https://dsarangi7.github.io/Echo/

`.github/workflows/pages.yml` runs on every push to `main`. It installs with `npm ci`, builds with `npm run build`, and deploys `dist/` with GitHub Pages from Actions. Vite `base` is `/Echo/`, so JS, CSS, and the favicon load under that path.

One-time repository setting (required before the first deploy succeeds):

**Settings → Pages → Build and deployment → Source: GitHub Actions**

After that, the workflow on `main` publishes the site. Re-run **Deploy GitHub Pages** from the Actions tab if a deploy failed before Pages was switched to GitHub Actions.
