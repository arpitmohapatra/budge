import { addDays, addMonths, addYears, differenceInCalendarDays, differenceInCalendarMonths, format } from 'date-fns';
import { rollBackToBusinessDay } from './holidays';
import type { Frequency, YMD } from './types';

export const toYMD = (d: Date): YMD => format(d, 'yyyy-MM-dd');
export const parseYMD = (s: YMD): Date => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};
export const todayYMD = (): YMD => toYMD(new Date());
export const addDaysYMD = (s: YMD, n: number): YMD => toYMD(addDays(parseYMD(s), n));
export const addMonthsYMD = (s: YMD, n: number): YMD => toYMD(addMonths(parseYMD(s), n));
/** a − b in calendar days. */
export const diffDays = (a: YMD, b: YMD): number => differenceInCalendarDays(parseYMD(a), parseYMD(b));
export const monthOf = (s: YMD): string => s.slice(0, 7);
export const monthStart = (ym: string): YMD => `${ym}-01`;
export const monthEnd = (ym: string): YMD => toYMD(new Date(Number(ym.slice(0, 4)), Number(ym.slice(5, 7)), 0));
export const addMonthsYM = (ym: string, n: number): string => monthOf(addMonthsYMD(monthStart(ym), n));
export const daysInMonth = (ym: string): number => Number(monthEnd(ym).slice(8, 10));
export const fmtDate = (s: YMD, f = 'MMM d'): string => format(parseYMD(s), f);

export function relativeDay(s: YMD, today: YMD): string {
  const d = diffDays(s, today);
  if (d === 0) return 'Today';
  if (d === 1) return 'Tomorrow';
  if (d === -1) return 'Yesterday';
  if (d > 1 && d < 7) return format(parseYMD(s), 'EEEE');
  return format(parseYMD(s), parseYMD(s).getFullYear() === parseYMD(today).getFullYear() ? 'EEE, MMM d' : 'MMM d, yyyy');
}

export const FREQUENCIES: { value: Frequency; label: string; short: string }[] = [
  { value: 'semimonthly', label: 'Twice a month', short: 'twice a month' },
  { value: 'weekly', label: 'Every week', short: 'weekly' },
  { value: 'biweekly', label: 'Every 2 weeks', short: 'bi-weekly' },
  { value: 'monthly', label: 'Every month', short: 'monthly' },
  { value: 'quarterly', label: 'Every 3 months', short: 'quarterly' },
  { value: 'yearly', label: 'Every year', short: 'yearly' },
];

/** The k-th occurrence (k ≥ 0) of a schedule that starts on `anchor`. Month-based schedules keep the anchor's day where possible. */
export function occurrence(anchor: YMD, freq: Frequency, k: number): YMD {
  const a = parseYMD(anchor);
  switch (freq) {
    case 'weekly': return toYMD(addDays(a, 7 * k));
    case 'biweekly': return toYMD(addDays(a, 14 * k));
    case 'monthly': return toYMD(addMonths(a, k));
    case 'quarterly': return toYMD(addMonths(a, 3 * k));
    case 'yearly': return toYMD(addYears(a, k));
    case 'semimonthly': return anchor;
  }
}

export interface ScheduleOpts { days?: [number, number]; rollBack?: boolean; }

const clampDay = (y: number, m: number, day: number) => new Date(y, m, Math.min(day, new Date(y, m + 1, 0).getDate()));

/**
 * All occurrences d with from ≤ d ≤ to (and ≤ endDate). Occurrences before the anchor never exist
 * (except 'semimonthly', which is purely day-of-month based). With `rollBack`, a date that lands on a
 * weekend/holiday moves to the last business day before it.
 */
export function occurrencesBetween(anchor: YMD, freq: Frequency, from: YMD, to: YMD, endDate?: YMD, opts: ScheduleOpts = {}): YMD[] {
  const limit = endDate && endDate < to ? endDate : to;
  if (limit < from) return [];
  if (opts.rollBack || freq === 'semimonthly') {
    // Work on the nominal schedule over a slightly wider window, adjust each date, then trim.
    const nominal = nominalBetween(anchor, freq, addDaysYMD(from, -10), addDaysYMD(limit, 10), opts);
    const out = new Set<YMD>();
    for (const n of nominal) {
      const d = opts.rollBack ? rollBackToBusinessDay(n) : n;
      if (d >= from && d <= limit) out.add(d);
    }
    return [...out].sort();
  }
  return nominalBetween(anchor, freq, from, limit, opts);
}

function nominalBetween(anchor: YMD, freq: Frequency, from: YMD, to: YMD, opts: ScheduleOpts): YMD[] {
  if (freq === 'semimonthly') {
    const [d1, d2] = opts.days ?? [7, 22];
    const f = parseYMD(from), t = parseYMD(to);
    const out: YMD[] = [];
    for (let y = f.getFullYear(), m = f.getMonth(); y < t.getFullYear() || (y === t.getFullYear() && m <= t.getMonth()); m++) {
      if (m > 11) { m = 0; y++; }
      for (const day of [d1, d2]) { const ymd = toYMD(clampDay(y, m, day)); if (ymd >= from && ymd <= to) out.push(ymd); }
    }
    return [...new Set(out)].sort();
  }
  const a = parseYMD(anchor);
  const f = parseYMD(from);
  let k0 = 0;
  if (f > a) {
    switch (freq) {
      case 'weekly': k0 = Math.floor(differenceInCalendarDays(f, a) / 7); break;
      case 'biweekly': k0 = Math.floor(differenceInCalendarDays(f, a) / 14); break;
      case 'monthly': k0 = differenceInCalendarMonths(f, a); break;
      case 'quarterly': k0 = Math.floor(differenceInCalendarMonths(f, a) / 3); break;
      case 'yearly': k0 = Math.floor(differenceInCalendarMonths(f, a) / 12); break;
      default: break;
    }
    k0 = Math.max(0, k0 - 1);
  }
  const out: YMD[] = [];
  for (let k = k0; k < k0 + 4000; k++) {
    const d = occurrence(anchor, freq, k);
    if (d > to) break;
    if (d >= from) out.push(d);
  }
  return out;
}

export const ordinal = (n: number): string => {
  const v = n % 100;
  return `${n}${v >= 11 && v <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th'}`;
};
