/**
 * Renders every icon, splash and Play graphic from the same ink-and-seal art.
 *   node scripts/make-brand-art.cjs
 * Uses the Playwright Chromium that ships with the dev environment.
 */
const { chromium } = require("playwright");
const { mkdirSync, writeFileSync } = require("node:fs");
const { dirname, join } = require("node:path");

const root = join(__dirname, "..");
const SEAL = "#C8372D";
const PAPER = "#F4EEE2";
const INK = "#2A2520";
const FUR = "#F1E8D8";

/** Cat head (idle) in the CatFigure coordinate space, centered near (160, 150). */
function head({ fill = FUR, stroke = INK, mono = false } = {}) {
  const ear = mono ? fill : "#E8A497";
  const face = mono
    ? ""
    : `
    <ellipse cx="131" cy="150" rx="15" ry="17" fill="${INK}"/><ellipse cx="189" cy="150" rx="15" ry="17" fill="${INK}"/>
    <circle cx="125" cy="143" r="5" fill="#FFFBF2"/><circle cx="183" cy="143" r="5" fill="#FFFBF2"/>
    <ellipse cx="112" cy="182" rx="14" ry="8" fill="#F0937F" opacity="0.45"/><ellipse cx="208" cy="182" rx="14" ry="8" fill="#F0937F" opacity="0.45"/>
    <path d="M153 174 L167 174 L160 182 Z" fill="#D9776A" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>
    <path d="M146 188 Q153 196 160 188 Q167 196 174 188" fill="none" stroke="${INK}" stroke-width="3.5" stroke-linecap="round"/>
    <g stroke="${INK}" stroke-width="2.4" stroke-linecap="round" opacity="0.8"><path d="M100 172 L66 166"/><path d="M100 182 L64 184"/><path d="M220 172 L254 166"/><path d="M220 182 L256 184"/></g>`;
  return `
    <path d="M120 116 L92 52 Q90 46 96 48 L160 100 Z" fill="${fill}" stroke="${stroke}" stroke-width="5" stroke-linejoin="round"/>
    <path d="M200 116 L228 52 Q230 46 224 48 L160 100 Z" fill="${fill}" stroke="${stroke}" stroke-width="5" stroke-linejoin="round"/>
    <path d="M122 106 L104 66 L148 100 Z" fill="${ear}"/><path d="M198 106 L216 66 L172 100 Z" fill="${ear}"/>
    <path d="M160 82 C214 82 240 118 240 160 C240 206 204 228 160 228 C116 228 80 206 80 160 C80 118 106 82 160 82 Z" fill="${fill}" stroke="${stroke}" stroke-width="5.5"/>
    ${face}`;
}

/** Head scaled into a box: (cx, cy) center, s = scale. */
const placed = (cx, cy, s, opts) => `<g transform="translate(${cx} ${cy}) scale(${s}) translate(-160 -140)">${head(opts)}</g>`;

const sealTile = (size, inset = 0) => {
  const r = size * 0.22;
  return `<rect x="${inset}" y="${inset}" width="${size - 2 * inset}" height="${size - 2 * inset}" rx="${r}" fill="${SEAL}"/>
    <rect x="${inset + size * 0.06}" y="${inset + size * 0.06}" width="${size - 2 * inset - size * 0.12}" height="${size - 2 * inset - size * 0.12}" rx="${r * 0.7}" fill="none" stroke="#FFF1DF" stroke-opacity="0.55" stroke-width="${size * 0.012}"/>`;
};

const svg = (w, h, body, bg = "none") =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${bg !== "none" ? `<rect width="${w}" height="${h}" fill="${bg}"/>` : ""}${body}</svg>`;

const icon = (size) => svg(size, size, sealTile(size) + placed(size / 2, size * 0.53, size / 330));
const maskable = (size) => svg(size, size, placed(size / 2, size * 0.53, size / 420), SEAL);
const foreground = (size) => svg(size, size, placed(size / 2, size * 0.53, size / 520));
const monochrome = (size) => svg(size, size, placed(size / 2, size * 0.53, size / 520, { fill: "#FFFFFF", stroke: "#FFFFFF", mono: true }));
const round = (size) => svg(size, size, `<circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="${SEAL}"/>` + placed(size / 2, size * 0.53, size / 380));

function splash(w, h) {
  const s = Math.min(w, h);
  const tile = s * 0.34;
  const x = (w - tile) / 2;
  const y = h * 0.42 - tile / 2;
  return svg(
    w,
    h,
    `<g transform="translate(${x} ${y})">${sealTile(tile)}${placed(tile / 2, tile * 0.53, tile / 330)}</g>
     <text x="${w / 2}" y="${y + tile + s * 0.13}" text-anchor="middle" font-family="Georgia, serif" font-weight="700" font-size="${s * 0.075}" fill="${INK}">课猫 Echo</text>`,
    PAPER,
  );
}

function feature() {
  const w = 1024;
  const h = 500;
  return svg(
    w,
    h,
    `<defs><radialGradient id="g" cx="0.75" cy="0.2" r="0.8"><stop offset="0" stop-color="#F7DCCF"/><stop offset="1" stop-color="${PAPER}"/></radialGradient></defs>
     <rect width="${w}" height="${h}" fill="url(#g)"/>
     <g transform="translate(730 110)">${sealTile(240)}${placed(120, 128, 240 / 330)}</g>
     <text x="72" y="190" font-family="Georgia, serif" font-weight="700" font-size="84" fill="${INK}">课猫 Echo</text>
     <text x="76" y="262" font-family="Georgia, serif" font-size="30" fill="#5F564A">Speak English &amp; Chinese for life in China</text>
     <text x="76" y="312" font-family="'Noto Serif CJK SC', 'Songti SC', serif" font-size="30" fill="#5F564A">打车 · 外卖 · 办公室 · 超市 — 听一句，说一句</text>
     <g transform="translate(76 362)"><rect width="218" height="54" rx="27" fill="${INK}"/><text x="109" y="36" text-anchor="middle" font-family="Georgia, serif" font-size="24" fill="${PAPER}">Free · offline</text></g>`,
  );
}

const jobs = [];
const add = (path, w, h, markup) => jobs.push({ path: join(root, path), w, h, markup });

for (const [dir, px] of [["mdpi", 48], ["hdpi", 72], ["xhdpi", 96], ["xxhdpi", 144], ["xxxhdpi", 192]]) {
  add(`android/app/src/main/res/mipmap-${dir}/ic_launcher.png`, px, px, icon(px));
  add(`android/app/src/main/res/mipmap-${dir}/ic_launcher_round.png`, px, px, round(px));
  const fg = Math.round(px * 2.25);
  add(`android/app/src/main/res/mipmap-${dir}/ic_launcher_foreground.png`, fg, fg, foreground(fg));
  add(`android/app/src/main/res/mipmap-${dir}/ic_launcher_monochrome.png`, fg, fg, monochrome(fg));
}
for (const [dir, w, h] of [
  ["drawable", 480, 320],
  ["drawable-land-mdpi", 480, 320], ["drawable-land-hdpi", 800, 480], ["drawable-land-xhdpi", 1280, 720], ["drawable-land-xxhdpi", 1600, 960], ["drawable-land-xxxhdpi", 1920, 1280],
  ["drawable-port-mdpi", 320, 480], ["drawable-port-hdpi", 480, 800], ["drawable-port-xhdpi", 720, 1280], ["drawable-port-xxhdpi", 960, 1600], ["drawable-port-xxxhdpi", 1280, 1920],
]) add(`android/app/src/main/res/${dir}/splash.png`, w, h, splash(w, h));
add("public/icons/icon-192.png", 192, 192, icon(192));
add("public/icons/icon-512.png", 512, 512, icon(512));
add("public/icons/icon-maskable-512.png", 512, 512, maskable(512));
add("public/icons/apple-touch-icon.png", 180, 180, maskable(180));
add("docs/play-store/hi-res-icon-512.png", 512, 512, maskable(512));
add("docs/play-store/feature-graphic-1024x500.png", 1024, 500, feature());

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  for (const job of jobs) {
    await page.setViewportSize({ width: job.w, height: job.h });
    await page.setContent(`<html><body style="margin:0;background:transparent">${job.markup}</body></html>`);
    mkdirSync(dirname(job.path), { recursive: true });
    await page.locator("svg").screenshot({ path: job.path, omitBackground: true });
  }
  await browser.close();
  writeFileSync(join(root, "public/favicon.svg"), icon(64).replace('width="64" height="64"', 'width="32" height="32"') + "\n");
  console.log(`brand art: ${jobs.length} images`);
})();
