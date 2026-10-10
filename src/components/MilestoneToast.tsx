import type { Lang } from "../practice/types";
import { milestoneLines, type MilestoneDay } from "../ui/streakCopy";

type Props = {
  day: MilestoneDay;
  lang: Lang;
  onDismiss: () => void;
};

/** Soft card for days 3, 7, and 14. Copy is Chan's; reaching the day is Kai's. */
export function MilestoneToast({ day, lang, onDismiss }: Props) {
  const lines = milestoneLines(day, lang);
  const primaryLang = lang === "zh" ? "zh-CN" : "en";
  const secondaryLang = lang === "zh" ? "en" : "zh-CN";

  return (
    <aside className="milestone-toast" id="milestone-toast" role="status" data-day={day}>
      <p className="primary" lang={primaryLang}>
        {lines.primary}
      </p>
      <p className="secondary" lang={secondaryLang}>
        {lines.secondary}
      </p>
      <button type="button" className="milestone-dismiss" id="milestone-dismiss" onClick={onDismiss}>
        <b>Got it</b>
        <small>知道了</small>
      </button>
    </aside>
  );
}
