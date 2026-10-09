export type Lang = "en" | "zh";

export type CatMode = "idle" | "listen" | "talk";

export type Sentence = {
  set: string;
  zhSet: string;
  en: string;
  zh: string;
};

export type Indexes = {
  en: number;
  zh: number;
};
