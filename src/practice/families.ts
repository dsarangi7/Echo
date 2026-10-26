import lessons from "../data/words-zh-families.json";

/**
 * Chinese word decks are family lessons: ordered related words and one anchor.
 * The Words tab renders them as a timeline. Office flashcards stay a separate deck.
 */
export const TIAN_DECK_ID = "tian";
export const TIAN_DECK_NAME = "天 family";
export const TIAN_DECK_ZH = "天字族";

export type FamilyMember = {
  id: string;
  /** Characters on the node. */
  zh: string;
  /** Tone-marked pinyin, as one reading (qiántiān, not qian2 tian1). */
  py: string;
  /** Short English gloss. */
  en: string;
};

export type FamilyLabel = {
  en: string;
  zh: string;
};

export type FamilyLesson = {
  id: string;
  /** Word-deck id this lesson belongs to. */
  deck: string;
  /** Head character in the title, such as 天. */
  hanzi: string;
  /** Member id drawn in blue. */
  anchor: string;
  /** Left end of the axis. Time families use earlier / 早. */
  earlier: FamilyLabel;
  /** Right end of the axis. Time families use later / 晚. */
  later: FamilyLabel;
  /** Earlier (or related) through later, left to right. */
  members: FamilyMember[];
};

const TONE = /[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/;

export const familyLessons = lessons as FamilyLesson[];

export function lessonsForDeck(deckId: string | null | undefined): FamilyLesson[] {
  if (!deckId) return [];
  return familyLessons.filter((lesson) => lesson.deck === deckId);
}

export function familyById(id: string): FamilyLesson | undefined {
  return familyLessons.find((lesson) => lesson.id === id);
}

export function anchorOf(lesson: FamilyLesson): FamilyMember | undefined {
  return lesson.members.find((member) => member.id === lesson.anchor);
}

/** Card heading, matching “The 天 family, anchored on 今天”. */
export function familyTitle(lesson: FamilyLesson): string {
  const anchor = anchorOf(lesson);
  return `The ${lesson.hanzi} family, anchored on ${anchor?.zh ?? lesson.hanzi}`;
}

/** Empty when every family lesson is a usable timeline. */
export function familyIssues(list: readonly FamilyLesson[], deckIds?: readonly string[]): string {
  const err: string[] = [];
  if (list.length === 0) err.push("no family lessons");
  const ids = new Set<string>();
  for (const lesson of list) {
    if (!/^[a-z0-9-]+$/.test(lesson.id)) err.push(`bad family id ${lesson.id}`);
    if (ids.has(lesson.id)) err.push(`duplicate family ${lesson.id}`);
    ids.add(lesson.id);
    if (!lesson.deck.trim()) err.push(`empty deck ${lesson.id}`);
    if (deckIds && !deckIds.includes(lesson.deck)) err.push(`unknown deck ${lesson.deck}`);
    if (!lesson.hanzi.trim()) err.push(`empty hanzi ${lesson.id}`);
    if (!lesson.earlier?.en.trim() || !lesson.earlier?.zh.trim()) err.push(`empty earlier ${lesson.id}`);
    if (!lesson.later?.en.trim() || !lesson.later?.zh.trim()) err.push(`empty later ${lesson.id}`);
    if (lesson.members.length < 2) err.push(`short family ${lesson.id}`);
    const seen = new Set<string>();
    let anchors = 0;
    for (const member of lesson.members) {
      if (!/^[a-z0-9-]+$/.test(member.id)) err.push(`bad member ${member.id}`);
      if (seen.has(member.id)) err.push(`duplicate member ${member.id}`);
      seen.add(member.id);
      if (member.id === lesson.anchor) anchors += 1;
      if (!member.zh.trim() || !member.en.trim() || !member.py.trim()) err.push(`empty member ${member.id}`);
      if (/\d/.test(member.py) || !TONE.test(member.py)) err.push(`pinyin needs tone marks ${member.id}`);
    }
    if (anchors !== 1) err.push(`anchor ${lesson.anchor} on ${lesson.id}`);
  }
  return err.join("; ");
}
