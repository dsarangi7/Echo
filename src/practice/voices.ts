export type VoiceLike = {
  name: string;
  voiceURI?: string;
  lang: string;
  localService?: boolean;
};

function voiceBlob(v: VoiceLike): string {
  return `${v.name || ""} ${v.voiceURI || ""} ${v.lang || ""}`.toLowerCase();
}

function scoreEn(v: VoiceLike): number {
  const n = voiceBlob(v);
  let s = 0;
  if (/samantha|zira|karen|moira|fiona|tessa|veena|google us english|microsoft.*zira|microsoft.*jenny|aria|sara|susan|linda|hazel|female/.test(n)) s += 120;
  if (/female|woman|girl|lady/.test(n)) s += 50;
  if (/male|man|boy|david|mark|ravi|daniel|alex(?!a)/.test(n)) s -= 90;
  if (/en-us|en_us|united states/.test(n)) s += 25;
  if (/en-gb|en-au|en-in/.test(n)) s += 5;
  if (v.localService) s += 3;
  return s;
}

function scoreZh(v: VoiceLike): number {
  const n = voiceBlob(v);
  let s = 0;
  if (/tingting|xiao.?xiao|huihui|yaoyao|xiaoyi|xiaoxuan|xiaohan|xiaomeng|xiaomo|xiaorui|xiaoshuang|yunxia|zh-cn-xiaoxiao|google.*普通话|google.*中国|microsoft.*xiaoxiao|microsoft.*huihui|meijia|sinji|lili/.test(n)) s += 120;
  if (/female|woman|girl|女/.test(n)) s += 40;
  if (/male|man|boy|yunyang|yunjian|kangkang|男/.test(n)) s -= 90;
  if (/zh-cn|cmn-hans|普通话|中国大陆|mainland/.test(n)) s += 25;
  if (/zh-tw|zh-hk|cantonese|粤|台湾|香港/.test(n)) s -= 30;
  if (v.localService) s += 3;
  return s;
}

function englishPool<T extends VoiceLike>(voices: readonly T[]): T[] {
  return voices.filter((v) => {
    const code = (v.lang || "").toLowerCase();
    return code === "en-us" || code.indexOf("en-us") === 0 || code === "en_us" || code.indexOf("en") === 0;
  });
}

function chinesePool<T extends VoiceLike>(voices: readonly T[]): T[] {
  const strict = voices.filter((v) => {
    const code = (v.lang || "").toLowerCase();
    return (
      code === "zh-cn" ||
      code === "zh_cn" ||
      code.indexOf("zh-cn") === 0 ||
      code === "cmn-hans" ||
      code.indexOf("cmn") === 0 ||
      code === "zh" ||
      code.indexOf("zh-hans") === 0
    );
  });
  if (strict.length) return strict;
  return voices.filter((v) => /zh|chinese|mandarin|普通话|中文/i.test(`${v.lang || ""} ${v.name || ""}`));
}

export function rankVoices<T extends VoiceLike>(voices: readonly T[], lang: "en" | "zh"): T | null {
  const pool = lang === "en" ? englishPool(voices) : chinesePool(voices);
  const use = [...(pool.length ? pool : voices)];
  use.sort((a, b) => (lang === "en" ? scoreEn(b) - scoreEn(a) : scoreZh(b) - scoreZh(a)));
  return use[0] ?? null;
}

export function pickVoiceEn(): SpeechSynthesisVoice | null {
  return rankVoices(window.speechSynthesis?.getVoices() ?? [], "en");
}

export function pickVoiceZh(): SpeechSynthesisVoice | null {
  return rankVoices(window.speechSynthesis?.getVoices() ?? [], "zh");
}
