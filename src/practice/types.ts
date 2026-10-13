export type Lang = "en" | "zh";

export type CatMode = "idle" | "listen" | "talk";

export type Sentence = {
  set: string;
  zhSet: string;
  en: string;
  zh: string;
  /**
   * Tone-marked pinyin for Chinese practice. Learners read this.
   * Hear it and Say it keep using `zh`.
   */
  py?: string;
};

export type Indexes = {
  en: number;
  zh: number;
};
