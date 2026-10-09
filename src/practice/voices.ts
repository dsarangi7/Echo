function voiceBlob(v: SpeechSynthesisVoice): string {
  return `${v.name || ""} ${v.voiceURI || ""} ${v.lang || ""}`.toLowerCase();
}

export function pickVoiceEn(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis?.getVoices() ?? [];
  const en = voices.filter((v) => {
    const lang = (v.lang || "").toLowerCase();
    return lang === "en-us" || lang.indexOf("en-us") === 0 || lang === "en_us" || lang.indexOf("en") === 0;
  });
  const use = [...(en.length ? en : voices)];
  use.sort((a, b) => scoreEn(b) - scoreEn(a));
  return use[0] ?? null;
}

function scoreEn(v: SpeechSynthesisVoice): number {
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

export function pickVoiceZh(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis?.getVoices() ?? [];
  const zh = voices.filter((v) => {
    const lang = (v.lang || "").toLowerCase();
    return (
      lang === "zh-cn" ||
      lang === "zh_cn" ||
      lang.indexOf("zh-cn") === 0 ||
      lang === "cmn-hans" ||
      lang.indexOf("cmn") === 0 ||
      lang === "zh" ||
      lang.indexOf("zh-hans") === 0
    );
  });
  const pool = zh.length
    ? zh
    : voices.filter((v) => /zh|chinese|mandarin|普通话|中文/i.test(`${v.lang || ""} ${v.name || ""}`));
  const use = [...(pool.length ? pool : voices)];
  use.sort((a, b) => scoreZh(b) - scoreZh(a));
  return use[0] ?? null;
}

function scoreZh(v: SpeechSynthesisVoice): number {
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
