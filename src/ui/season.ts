/**
 * Seasonal outfit for the cat, chosen from the Asia/Shanghai calendar date.
 * Windows are generous on purpose: lunar holidays move every year, and a
 * lantern a week early is nicer than one that is missing on the day.
 */
export type Season = "spring-festival" | "mid-autumn" | "winter" | "plain";

function shanghaiMonthDay(now: Date): { month: number; day: number } {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai", month: "numeric", day: "numeric" }).formatToParts(now);
    const month = Number(parts.find((p) => p.type === "month")?.value);
    const day = Number(parts.find((p) => p.type === "day")?.value);
    if (month && day) return { month, day };
  } catch {
    /* Old engines without time zones fall through to the device date. */
  }
  return { month: now.getMonth() + 1, day: now.getDate() };
}

export function seasonFor(now: Date = new Date()): Season {
  const { month, day } = shanghaiMonthDay(now);
  const md = month * 100 + day;
  if (md >= 115 && md <= 228) return "spring-festival";
  if (md >= 905 && md <= 1008) return "mid-autumn";
  if (md >= 1201 || md <= 114) return "winter";
  return "plain";
}
