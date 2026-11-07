import { addDays, getDay } from 'date-fns';
import { parseYMD, toYMD } from './dates';
import type { YMD } from './types';

/** nth (1-based) given weekday (0=Sun) of a month; n = -1 means the last one. */
function nthWeekday(year: number, month: number, weekday: number, n: number): Date {
  if (n > 0) {
    const first = new Date(year, month, 1);
    const offset = (weekday - first.getDay() + 7) % 7;
    return new Date(year, month, 1 + offset + (n - 1) * 7);
  }
  const last = new Date(year, month + 1, 0);
  const offset = (last.getDay() - weekday + 7) % 7;
  return new Date(year, month, last.getDate() - offset);
}

const cache = new Map<number, Set<YMD>>();

/** US federal holidays (as observed — a Sunday holiday is observed on Monday). Saturdays are weekends anyway. */
export function usHolidays(year: number): Set<YMD> {
  const hit = cache.get(year);
  if (hit) return hit;
  const raw: Date[] = [
    new Date(year, 0, 1),            // New Year's Day
    nthWeekday(year, 0, 1, 3),       // Martin Luther King Jr. Day
    nthWeekday(year, 1, 1, 3),       // Presidents' Day
    nthWeekday(year, 4, 1, -1),      // Memorial Day
    new Date(year, 5, 19),           // Juneteenth
    new Date(year, 6, 4),            // Independence Day
    nthWeekday(year, 8, 1, 1),       // Labor Day
    nthWeekday(year, 9, 1, 2),       // Columbus / Indigenous Peoples' Day
    new Date(year, 10, 11),          // Veterans Day
    nthWeekday(year, 10, 4, 4),      // Thanksgiving
    new Date(year, 11, 25),          // Christmas
  ];
  const set = new Set<YMD>();
  for (const d of raw) set.add(toYMD(getDay(d) === 0 ? addDays(d, 1) : d));
  // New Year's Day of next year observed on Dec 31 isn't a thing for banks, so no spill-over.
  cache.set(year, set);
  return set;
}

export function isBusinessDay(s: YMD): boolean {
  const d = parseYMD(s);
  const wd = d.getDay();
  if (wd === 0 || wd === 6) return false;
  return !usHolidays(d.getFullYear()).has(s);
}

/** The date itself if it's a business day, otherwise the last business day before it (e.g. the Friday before a weekend). */
export function rollBackToBusinessDay(s: YMD): YMD {
  let d = parseYMD(s);
  for (let i = 0; i < 10 && !isBusinessDay(toYMD(d)); i++) d = addDays(d, -1);
  return toYMD(d);
}
