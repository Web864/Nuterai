/**
 * Reminder scheduling utilities — pure functions.
 * Timezone-aware next-occurrence calculation, quiet-hours check.
 */

export type ReminderRow = {
  id: string;
  type: string;
  title: string;
  message: string | null;
  times: string[];
  days_of_week: number[];
  timezone: string;
  is_active: boolean;
  is_recurring: boolean;
  one_time_at: string | null;
  snooze_until: string | null;
};

/** Parse "HH:MM" -> {h,m} or null */
export function parseHHMM(t: string): { h: number; m: number } | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(t.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const mm = Number(m[2]);
  if (h < 0 || h > 23 || mm < 0 || mm > 59) return null;
  return { h, m: mm };
}

/** Detect user's IANA timezone */
export function detectTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

/** Get Y-M-D-h-m in target tz for a Date */
function partsInTz(date: Date, tz: string) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    weekday: "short",
  });
  const parts = Object.fromEntries(fmt.formatToParts(date).map((p) => [p.type, p.value])) as Record<
    string,
    string
  >;
  const wdMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour === "24" ? "0" : parts.hour),
    minute: Number(parts.minute),
    weekday: wdMap[parts.weekday] ?? 0,
  };
}

/** Given a local wall-clock date/time in tz, compute the UTC Date. */
function zonedTimeToUtc(y: number, mo: number, d: number, h: number, mi: number, tz: string): Date {
  // Binary-search-free approach: iterate up to 2 corrections for DST.
  let guess = new Date(Date.UTC(y, mo - 1, d, h, mi, 0));
  for (let i = 0; i < 3; i++) {
    const p = partsInTz(guess, tz);
    const diffMin =
      (p.year - y) * 525600 +
      (p.month - mo) * 43800 +
      (p.day - d) * 1440 +
      (p.hour - h) * 60 +
      (p.minute - mi);
    if (diffMin === 0) break;
    guess = new Date(guess.getTime() - diffMin * 60_000);
  }
  return guess;
}

/**
 * Compute the next scheduled datetime for a reminder, strictly after `from`.
 * Returns null if the reminder has no future occurrence.
 */
export function nextOccurrence(r: ReminderRow, from: Date = new Date()): Date | null {
  if (!r.is_active) return null;

  // Snoozed?
  if (r.snooze_until) {
    const snz = new Date(r.snooze_until);
    if (snz > from) return snz;
  }

  // One-time
  if (!r.is_recurring) {
    if (!r.one_time_at) return null;
    const t = new Date(r.one_time_at);
    return t > from ? t : null;
  }

  const tz = r.timezone || "UTC";
  const times = r.times.map(parseHHMM).filter((x): x is { h: number; m: number } => !!x);
  if (times.length === 0) return null;
  const days = r.days_of_week?.length ? r.days_of_week : [0, 1, 2, 3, 4, 5, 6];

  // Scan next 8 days
  for (let offset = 0; offset < 8; offset++) {
    const base = new Date(from.getTime() + offset * 86_400_000);
    const p = partsInTz(base, tz);
    if (!days.includes(p.weekday)) continue;
    // Sort times ascending
    const sorted = [...times].sort((a, b) => a.h * 60 + a.m - (b.h * 60 + b.m));
    for (const t of sorted) {
      const cand = zonedTimeToUtc(p.year, p.month, p.day, t.h, t.m, tz);
      if (cand > from) return cand;
    }
  }
  return null;
}

/** Is `date` inside quiet hours [startHHMM, endHHMM] in tz? Wrap over midnight allowed. */
export function inQuietHours(
  date: Date,
  tz: string,
  start: string | null | undefined,
  end: string | null | undefined,
): boolean {
  if (!start || !end) return false;
  const s = parseHHMM(start);
  const e = parseHHMM(end);
  if (!s || !e) return false;
  const p = partsInTz(date, tz);
  const cur = p.hour * 60 + p.minute;
  const sm = s.h * 60 + s.m;
  const em = e.h * 60 + e.m;
  if (sm === em) return false;
  if (sm < em) return cur >= sm && cur < em;
  // wraps midnight
  return cur >= sm || cur < em;
}

export function typeLabel(t: string): string {
  return (
    {
      meal: "Meal",
      workout: "Workout",
      water: "Water",
      weight: "Weight",
      sleep: "Sleep",
      medication: "Medication",
      custom: "Reminder",
    }[t] ?? "Reminder"
  );
}

export function formatWhen(d: Date): string {
  const now = new Date();
  const diffMin = Math.round((d.getTime() - now.getTime()) / 60_000);
  if (diffMin < 1) return "now";
  if (diffMin < 60) return `in ${diffMin} min`;
  if (diffMin < 60 * 24) {
    const h = Math.round(diffMin / 60);
    return `in ${h} h`;
  }
  return d.toLocaleString([], { weekday: "short", hour: "2-digit", minute: "2-digit" });
}
