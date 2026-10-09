import type { Sentence } from "./types";
import packEnJson from "../data/pack-en.json";
import packZhJson from "../data/pack-zh.json";

export const packEn = packEnJson as Sentence[];
export const packZh = packZhJson as Sentence[];

export const packs = {
  en: packEn,
  zh: packZh,
} as const;

export function packError(): string {
  const err: string[] = [];
  if (packEn.length !== 100) err.push(`EN pack is ${packEn.length}`);
  if (packZh.length !== 100) err.push(`ZH pack is ${packZh.length}`);
  return err.join("; ");
}
