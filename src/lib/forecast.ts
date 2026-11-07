import { addDaysYMD, diffDays } from './dates';
import { avgDailySpend, balances, isLiquid, primaryAccount, recOccurrences, round2 } from './ledger';
import type { Account, AppState, YMD } from './types';

export interface ForecastEvent {
  date: YMD;
  label: string;
  /** Signed: + money in, − money out. */
  amount: number;
  kind: 'income' | 'bill' | 'due';
  accountId: string;
  profileId: string;
  refType?: 'recurring' | 'due';
  refId?: string;
}

export interface ForecastDay {
  date: YMD;
  balance: number;
  events: ForecastEvent[];
  /** Estimated everyday spending assumed for this day. */
  spend: number;
}

export interface AccountLow { accountId: string; name: string; balance: number; date: YMD; }

export interface Forecast {
  today: YMD;
  /** days[0] is today (current balance); days[i] is end-of-day i days from now. */
  days: ForecastDay[];
  start: number;
  end: number;
  low: { date: YMD; balance: number; index: number };
  /** suffixMin[i] = lowest balance on any day ≥ i. */
  suffixMin: number[];
  suffixMinIdx: number[];
  avgDaily: number;
  events: ForecastEvent[];
  income: number;
  bills: number;
  spending: number;
  accountLows: AccountLow[];
  hasPrimary: boolean;
}

export function liquidAccounts(state: AppState, scope: string[]): Account[] {
  return state.accounts.filter(
    (a) => scope.includes(a.profileId) && !a.archived && isLiquid(a) && (state.settings.includeSavings || a.kind !== 'savings'),
  );
}

/** Day-by-day projection of your cash from scheduled income, bills, card dues and average everyday spending. */
export function forecast(state: AppState, scope: string[], horizon: number, today: YMD, bal = balances(state, today)): Forecast {
  const accts = liquidAccounts(state, scope);
  const ids = new Set(accts.map((a) => a.id));
  const prim = new Map<string, string | undefined>();
  for (const pid of scope) prim.set(pid, primaryAccount(state, pid, state.settings.includeSavings)?.id);
  const route = (accountId: string | undefined, profileId: string): string | undefined => {
    if (accountId && ids.has(accountId)) return accountId;
    const p = prim.get(profileId); // cards & unknown accounts hit your main account
    const acc = accountId ? state.accounts.find((a) => a.id === accountId) : undefined;
    if (!acc || acc.kind === 'credit') return p && ids.has(p) ? p : undefined;
    return undefined; // e.g. savings excluded by settings
  };

  const from = addDaysYMD(today, 1);
  const to = addDaysYMD(today, horizon);
  const events: ForecastEvent[] = [];

  for (const r of state.recurring) {
    if (!r.active || !scope.includes(r.profileId)) continue;
    const acct = route(r.accountId, r.profileId);
    if (!acct) continue;
    const start = r.postedThrough >= from ? addDaysYMD(r.postedThrough, 1) : from;
    for (const date of recOccurrences(r, start, to)) {
      events.push({ date, label: r.name, amount: r.kind === 'income' ? r.amount : -r.amount, kind: r.kind === 'income' ? 'income' : 'bill', accountId: acct, profileId: r.profileId, refType: 'recurring', refId: r.id });
    }
  }
  for (const d of state.dues) {
    if (d.status !== 'open' || !scope.includes(d.profileId) || d.date > to) continue;
    const acct = route(d.payFromId, d.profileId);
    if (!acct) continue;
    events.push({ date: d.date < from ? from : d.date, label: d.name, amount: -d.amount, kind: 'due', accountId: acct, profileId: d.profileId, refType: 'due', refId: d.id });
  }
  events.sort((a, b) => a.date.localeCompare(b.date) || a.amount - b.amount);

  const byDate = new Map<YMD, ForecastEvent[]>();
  for (const e of events) { const l = byDate.get(e.date) ?? []; l.push(e); byDate.set(e.date, l); }

  // Everyday spending: each profile's average comes out of their main account.
  const daily = new Map<string, number>(); // accountId -> per-day spend
  let avgTotal = 0, hasPrimary = false;
  for (const pid of scope) {
    const acct = prim.get(pid);
    const avg = avgDailySpend(state, pid, today, state.settings.windowDays);
    if (acct && ids.has(acct)) { daily.set(acct, (daily.get(acct) ?? 0) + avg); avgTotal += avg; hasPrimary = true; }
  }

  const running = new Map<string, number>(accts.map((a) => [a.id, bal[a.id] ?? 0]));
  const lows = new Map<string, AccountLow>(accts.map((a) => [a.id, { accountId: a.id, name: a.name, balance: bal[a.id] ?? 0, date: today }]));
  const sum = () => { let s = 0; for (const v of running.values()) s += v; return round2(s); };
  const start = sum();
  const days: ForecastDay[] = [{ date: today, balance: start, events: [], spend: 0 }];
  let income = 0, bills = 0, spending = 0;

  for (let i = 1; i <= horizon; i++) {
    const date = addDaysYMD(today, i);
    const evs = byDate.get(date) ?? [];
    for (const e of evs) {
      running.set(e.accountId, (running.get(e.accountId) ?? 0) + e.amount);
      if (e.amount > 0) income += e.amount; else bills -= e.amount;
    }
    for (const [acct, v] of daily) running.set(acct, (running.get(acct) ?? 0) - v);
    spending += avgTotal;
    for (const [id, v] of running) {
      const l = lows.get(id)!;
      if (v < l.balance) { l.balance = round2(v); l.date = date; }
    }
    days.push({ date, balance: sum(), events: evs, spend: avgTotal });
  }

  const n = days.length;
  const suffixMin = new Array<number>(n);
  const suffixMinIdx = new Array<number>(n);
  let m = Infinity, mi = n - 1;
  for (let i = n - 1; i >= 0; i--) {
    if (days[i].balance <= m) { m = days[i].balance; mi = i; }
    suffixMin[i] = m; suffixMinIdx[i] = mi;
  }
  const lowIdx = suffixMinIdx[0];

  return {
    today, days, start, end: days[n - 1].balance, suffixMin, suffixMinIdx,
    low: { date: days[lowIdx].date, balance: days[lowIdx].balance, index: lowIdx },
    avgDaily: round2(avgTotal), events, income: round2(income), bills: round2(bills), spending: round2(spending),
    accountLows: [...lows.values()].filter((l) => l.balance < 0).sort((a, b) => a.balance - b.balance),
    hasPrimary,
  };
}

/* ───────── "Can I afford it?" ───────── */
export type Verdict = 'yes' | 'tight' | 'no';

export interface Affordability {
  verdict: Verdict;
  /** Lowest your cash gets between the purchase date and the end of the forecast. */
  lowAfter: number;
  lowDate: YMD;
  /** lowAfter − buffer. Negative means you'd eat into your cushion. */
  slack: number;
  /** The most you could spend on that date and still keep your cushion. */
  maxAmount: number;
  /** Earliest date (within the forecast) you could buy it and keep your cushion. */
  earliest?: YMD;
  /** Whether the purchase date is inside the forecast window. */
  inRange: boolean;
}

export function checkAffordability(fc: Forecast, amount: number, date: YMD, buffer: number): Affordability {
  const n = fc.days.length;
  const idx = Math.min(Math.max(diffDays(date, fc.today), 0), n - 1);
  const inRange = diffDays(date, fc.today) <= n - 1;
  const lowAfter = round2(fc.suffixMin[idx] - amount);
  const lowDate = fc.days[fc.suffixMinIdx[idx]].date;
  const verdict: Verdict = lowAfter >= buffer ? 'yes' : lowAfter >= 0 ? 'tight' : 'no';
  let earliest: YMD | undefined;
  for (let i = 0; i < n; i++) {
    if (fc.suffixMin[i] - amount >= buffer) { earliest = fc.days[i].date; break; }
  }
  return { verdict, lowAfter, lowDate, slack: round2(lowAfter - buffer), maxAmount: Math.max(0, round2(fc.suffixMin[idx] - buffer)), earliest, inRange };
}

/** Horizon big enough to cover a purchase date (min 90 days, max 365). */
export function horizonFor(date: YMD, today: YMD, min = 90): number {
  return Math.min(365, Math.max(min, diffDays(date, today) + 45));
}

/* ───────── Safe to spend until payday ───────── */
export interface SafeToSpend {
  liquid: number;
  commitments: number;
  safe: number;
  perDay: number;
  days: number;
  untilDate: YMD;
  /** True when the date is a real upcoming paycheck (otherwise month-end). */
  payday: boolean;
  avgDaily: number;
}

export function safeToSpend(state: AppState, scope: string[], today: YMD, bal = balances(state, today)): SafeToSpend {
  // "Safe to spend" is about spending money: checking & cash, never savings.
  const accts = liquidAccounts(state, scope).filter((a) => a.kind !== 'savings');
  const liquid = round2(accts.reduce((s, a) => s + (bal[a.id] ?? 0), 0));

  let next: YMD | undefined;
  for (const r of state.recurring) {
    if (!r.active || r.kind !== 'income' || !scope.includes(r.profileId)) continue;
    const start = r.postedThrough >= today ? addDaysYMD(r.postedThrough, 1) : addDaysYMD(today, 1);
    const d = recOccurrences(r, start, addDaysYMD(today, 62))[0];
    if (d && (!next || d < next)) next = d;
  }
  const payday = !!next;
  const until: YMD = next ?? (() => { const d = new Date(Number(today.slice(0, 4)), Number(today.slice(5, 7)), 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`; })();
  const fc = forecast(state, scope, Math.max(1, diffDays(until, today)), today, bal);
  let commitments = 0;
  for (const e of fc.events) if (e.date < until && e.amount < 0) commitments -= e.amount;
  commitments = round2(commitments);
  const days = Math.max(1, diffDays(until, today));
  const safe = round2(liquid - commitments);
  return { liquid, commitments, safe, perDay: round2(safe / days), days, untilDate: until, payday, avgDaily: fc.avgDaily };
}
