/**
 * Write tone-marked pinyin onto the Chinese pack and the cat intro.
 *
 * The app does not run this. `py` in src/data/pack-zh.json and src/data/intro.json
 * is the reading text learners see. `zh` stays the characters Piper recorded and
 * the line Say it grades.
 *
 * pinyin-pro supplies tone marks, neutral tones, and 一/不 sandhi. The overrides
 * below correct readings the segmenter gets wrong for this office/taxi pack.
 * Syllables stay spaced so each tone can be marked on its own.
 *
 *   node scripts/fill-pinyin.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { customPinyin, pinyin } from "pinyin-pro";

customPinyin({
  重开: "chóng kāi",
  公差: "gōng chā",
  超差: "chāo chā",
  起订量: "qǐ dìng liàng",
  送货单: "sòng huò dān",
  零点一: "líng diǎn yī",
  课猫: "Kè Māo",
});

const PUNCT = {
  "，": ",",
  "。": ".",
  "？": "?",
  "！": "!",
  "、": ",",
  "：": ":",
  "；": ";",
};

/** @param {string} text */
export function tonePinyin(text) {
  const rows = pinyin(text, { toneType: "symbol", type: "all", toneSandhi: true, segmentit: 2 });
  /** @type {{ kind: "syl" | "punct", text: string }[]} */
  const tokens = [];
  for (let i = 0; i < rows.length; i++) {
    const cur = rows[i];
    const next = rows[i + 1];
    if (cur.origin === "这" && next?.origin === "儿") {
      tokens.push({ kind: "syl", text: "zhèr" });
      i += 1;
      continue;
    }
    if (!cur.isZh) {
      tokens.push({ kind: "punct", text: cur.origin });
      continue;
    }
    tokens.push({ kind: "syl", text: cur.result });
  }

  let out = "";
  let cap = true;
  for (const token of tokens) {
    if (token.kind === "punct") {
      const mark = PUNCT[token.text] ?? token.text;
      out = out.replace(/\s+$/, "");
      out += `${mark} `;
      cap = /[.!?]/.test(mark);
      continue;
    }
    let syl = token.text;
    if (cap && syl) {
      syl = syl.charAt(0).toLocaleUpperCase("en") + syl.slice(1);
      cap = false;
    }
    if (out && !/\s$/.test(out)) out += " ";
    out += syl;
  }
  return out.replace(/\s+/g, " ").trim();
}

const packPath = new URL("../src/data/pack-zh.json", import.meta.url);
const introPath = new URL("../src/data/intro.json", import.meta.url);
const pack = JSON.parse(readFileSync(packPath, "utf8"));
const intro = JSON.parse(readFileSync(introPath, "utf8"));

const nextPack = pack.map((row) => ({
  set: row.set,
  zhSet: row.zhSet,
  en: row.en,
  zh: row.zh,
  py: tonePinyin(row.zh),
}));
intro.py = tonePinyin(intro.zh);

writeFileSync(packPath, `${JSON.stringify(nextPack, null, 2)}\n`);
writeFileSync(introPath, `${JSON.stringify(intro, null, 2)}\n`);

for (const row of nextPack) console.log(`${row.zh}\n  ${row.py}`);
console.log(`${intro.zh}\n  ${intro.py}`);
