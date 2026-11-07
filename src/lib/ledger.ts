import { addDaysYMD, daysInMonth, diffDays, monthEnd, monthOf, monthStart, occurrencesBetween } from './dates';
import type { Account, AppState, Budget, Category, Due, Holding, Recurring, Transaction, YMD } from './types';

export const uid = (): string =>
  (globalThis.crypto && 'randomUUID' in globalThis.crypto)
    ? globalThis.crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);

export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/* ───────── Categories ───────── */
export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'groceries', name: 'Groceries', icon: 'cart', color: '#4E9F6B', kind: 'expense' },
  { id: 'dining', name: 'Dining out', icon: 'utensils', color: '#E0803F', kind: 'expense' },
  { id: 'housing', name: 'Rent & home', icon: 'home', color: '#2F74B5', kind: 'expense' },
  { id: 'utilities', name: 'Utilities', icon: 'zap', color: '#D19A2A', kind: 'expense' },
  { id: 'transport', name: 'Transport & gas', icon: 'car', color: '#6B6FD6', kind: 'expense' },
  { id: 'subscriptions', name: 'Subscriptions', icon: 'repeat', color: '#A855A8', kind: 'expense' },
  { id: 'shopping', name: 'Shopping', icon: 'bag', color: '#D9577A', kind: 'expense' },
  { id: 'health', name: 'Health', icon: 'health', color: '#2E9AA6', kind: 'expense' },
  { id: 'fun', name: 'Fun & outings', icon: 'ticket', color: '#C65E3B', kind: 'expense' },
  { id: 'travel', name: 'Travel', icon: 'plane', color: '#3E86C9', kind: 'expense' },
  { id: 'family', name: 'Kids & family', icon: 'baby', color: '#8A7BD1', kind: 'expense' },
  { id: 'education', name: 'Education', icon: 'grad', color: '#5876C9', kind: 'expense' },
  { id: 'cash', name: 'Cash & ATM', icon: 'cash', color: '#7A8B3A', kind: 'expense' },
  { id: 'insurance', name: 'Insurance', icon: 'shield', color: '#4F7F95', kind: 'expense' },
  { id: 'gifts', name: 'Gifts & giving', icon: 'gift', color: '#CF6A9B', kind: 'expense' },
  { id: 'fees', name: 'Fees & interest', icon: 'landmark', color: '#8C8C99', kind: 'expense' },
  { id: 'other', name: 'Other', icon: 'sparkles', color: '#8C8C99', kind: 'expense' },
  { id: 'paycheck', name: 'Paycheck', icon: 'briefcase', color: '#4E9F6B', kind: 'income' },
  { id: 'bonus', name: 'Bonus', icon: 'party', color: '#D19A2A', kind: 'income' },
  { id: 'interest', name: 'Interest & dividends', icon: 'sprout', color: '#2E9AA6', kind: 'income' },
  { id: 'income-other', name: 'Other income', icon: 'coins', color: '#8C8C99', kind: 'income' },
];

export const PROFILE_COLORS = ['#2F74B5', '#C65E3B', '#4E9F6B', '#8A7BD1', '#D19A2A', '#D9577A'];

export const catById = (state: Pick<AppState, 'categories'>, id?: string): Category | undefined =>
  id ? state.categories.find((c) => c.id === id) : undefined;

/* ───────── Accounts & balances ───────── */
export const isLiquid = (a: Account) => a.kind !== 'credit';

export function inScope<T extends { profileId: string }>(items: T[], scope: string[]): T[] {
  return items.filter((i) => scope.includes(i.profileId));
}

/** Current balance of every account, as of `today`. Cards are negative (what you owe). */
export function balances(state: AppState, today: YMD): Record<string, number> {
  const bal: Record<string, number> = {};
  const start: Record<string, YMD> = {};
  for (const a of state.accounts) { bal[a.id] = a.startingBalance; start[a.id] = a.startDate; }
  for (const t of state.transactions) {
    if (t.date > today) continue;
    const from = bal[t.accountId] !== undefined && t.date >= start[t.accountId];
    switch (t.type) {
      case 'expense': if (from) bal[t.accountId] -= t.amount; break;
      case 'income': if (from) bal[t.accountId] += t.amount; break;
      case 'adjust': if (from) bal[t.accountId] += t.amount; break;
      case 'transfer':
        if (from) bal[t.accountId] -= t.amount;
        if (t.toAccountId && bal[t.toAccountId] !== undefined && t.date >= start[t.toAccountId]) bal[t.toAccountId] += t.amount;
        break;
    }
  }
  for (const k of Object.keys(bal)) bal[k] = round2(bal[k]);
  return bal;
}

export function primaryAccount(state: AppState, profileId: string, includeSavings = true): Account | undefined {
  const mine = state.accounts.filter((a) => a.profileId === profileId && !a.archived && isLiquid(a));
  return (
    mine.find((a) => a.primary && a.kind !== 'credit') ??
    mine.find((a) => a.kind === 'checking') ??
    mine.find((a) => a.kind === 'cash') ??
    (includeSavings ? mine[0] : undefined)
  );
}

export interface Totals {
  liquid: number;
  cardDebt: number;
  invested: number;
  investedCost: number;
  netWorth: number;
}

export function totals(state: AppState, scope: string[], bal: Record<string, number>): Totals {
  let liquid = 0, cardDebt = 0;
  for (const a of inScope(state.accounts, scope)) {
    if (a.archived) continue;
    if (a.kind === 'credit') cardDebt += Math.max(0, -bal[a.id]) - Math.max(0, bal[a.id]);
    else liquid += bal[a.id];
  }
  let invested = 0, investedCost = 0;
  for (const h of inScope(state.holdings, scope)) { invested += h.value; investedCost += h.invested; }
  return {
    liquid: round2(liquid), cardDebt: round2(cardDebt), invested: round2(invested), investedCost: round2(investedCost),
    netWorth: round2(liquid - cardDebt + invested),
  };
}

/** Occurrences of a recurring item in [from, to], honouring its twice-a-month days and weekend/holiday roll-back. */
export function recOccurrences(r: Recurring, from: YMD, to: YMD): YMD[] {
  return occurrencesBetween(r.anchor, r.frequency, from, to, r.endDate, { days: r.days, rollBack: r.rollBack });
}

/* ───────── Posting scheduled items ───────── */
export interface MaterializeResult { state: AppState; created: Transaction[]; }

/** Turns every scheduled paycheck / bill / card due that has come due (≤ today) into real transactions. Idempotent. */
export function materialize(state: AppState, today: YMD): MaterializeResult {
  const created: Transaction[] = [];
  let changed = false;

  const recurring = state.recurring.map((r): Recurring => {
    if (!r.active || r.postedThrough >= today) return r;
    const from = addDaysYMD(r.postedThrough, 1);
    const dates = recOccurrences(r, from, today);
    for (const date of dates) {
      created.push({
        id: uid(), profileId: r.profileId, type: r.kind, amount: r.amount, date, accountId: r.accountId,
        categoryId: r.categoryId ?? (r.kind === 'income' ? 'paycheck' : 'other'), note: r.name, recurringId: r.id, createdAt: Date.now(),
      });
    }
    changed = true;
    return { ...r, postedThrough: today };
  });

  const dues = state.dues.map((d): Due => {
    if (d.status !== 'open' || d.date > today) return d;
    const id = uid();
    created.push(
      d.accountId
        ? { id, profileId: d.profileId, type: 'transfer', amount: d.amount, date: d.date, accountId: d.payFromId, toAccountId: d.accountId, note: d.name, dueId: d.id, createdAt: Date.now() }
        : { id, profileId: d.profileId, type: 'expense', amount: d.amount, date: d.date, accountId: d.payFromId, categoryId: d.categoryId ?? 'other', note: d.name, dueId: d.id, createdAt: Date.now() },
    );
    changed = true;
    return { ...d, status: 'paid', txId: id };
  });

  if (!changed) return { state, created };
  return { state: { ...state, recurring, dues, transactions: [...state.transactions, ...created] }, created };
}

/* ───────── Spending stats ───────── */
export function spendByCategory(state: AppState, scope: string[], from: YMD, to: YMD): Map<string, number> {
  const m = new Map<string, number>();
  for (const t of state.transactions) {
    if (t.type !== 'expense' || t.date < from || t.date > to || !scope.includes(t.profileId)) continue;
    const k = t.categoryId ?? 'other';
    m.set(k, (m.get(k) ?? 0) + t.amount);
  }
  return m;
}

export function monthTotals(state: AppState, scope: string[], ym: string) {
  const from = monthStart(ym), to = monthEnd(ym);
  let income = 0, spent = 0;
  for (const t of state.transactions) {
    if (t.date < from || t.date > to || !scope.includes(t.profileId)) continue;
    if (t.type === 'income') income += t.amount;
    else if (t.type === 'expense') spent += t.amount;
  }
  return { income: round2(income), spent: round2(spent), saved: round2(income - spent) };
}

/** Typical daily "everyday" spending (excludes scheduled bills and card payments). */
export function avgDailySpend(state: AppState, profileId: string, today: YMD, windowDays: number): number {
  const override = state.settings.dailyOverride[profileId];
  if (override !== undefined && override !== null) return override;
  const from = addDaysYMD(today, -(windowDays - 1));
  let total = 0;
  let history: YMD = today;
  for (const a of state.accounts) if (a.profileId === profileId && a.startDate < history) history = a.startDate;
  for (const t of state.transactions) {
    if (t.profileId !== profileId) continue;
    if (t.date < history) history = t.date;
    if (t.type !== 'expense' || t.recurringId || t.dueId || t.date < from || t.date > today) continue;
    total += t.amount;
  }
  const days = Math.min(windowDays, Math.max(14, diffDays(today, history) + 1));
  return round2(total / days);
}

/* ───────── Budgets ───────── */
export type BudgetState = 'ok' | 'watch' | 'over';
export interface BudgetRow {
  categoryId: string;
  limit: number;
  spent: number;
  remaining: number;
  pct: number;
  projected: number;
  state: BudgetState;
  budgetIds: string[];
}

export function budgetRows(state: AppState, scope: string[], ym: string, today: YMD): BudgetRow[] {
  const spend = spendByCategory(state, scope, monthStart(ym), monthEnd(ym));
  const limits = new Map<string, { limit: number; ids: string[] }>();
  for (const b of inScope(state.budgets, scope) as Budget[]) {
    const cur = limits.get(b.categoryId) ?? { limit: 0, ids: [] };
    cur.limit += b.amount; cur.ids.push(b.id);
    limits.set(b.categoryId, cur);
  }
  const cur = monthOf(today);
  const frac = ym < cur ? 1 : ym > cur ? 0 : Number(today.slice(8, 10)) / daysInMonth(ym);
  const dayOfMonth = Number(today.slice(8, 10));
  const rows: BudgetRow[] = [];
  for (const [categoryId, { limit, ids }] of limits) {
    const spent = round2(spend.get(categoryId) ?? 0);
    const pct = limit > 0 ? spent / limit : 0;
    const projected = ym === cur && frac > 0 ? round2(spent / frac) : spent;
    let st: BudgetState = 'ok';
    if (spent > limit) st = 'over';
    else if (pct >= 0.8 || (ym === cur && dayOfMonth >= 10 && projected > limit * 1.15)) st = 'watch';
    rows.push({ categoryId, limit, spent, remaining: round2(limit - spent), pct, projected, state: st, budgetIds: ids });
  }
  const order = { over: 0, watch: 1, ok: 2 } as const;
  return rows.sort((a, b) => order[a.state] - order[b.state] || b.pct - a.pct);
}

/** Suggest a monthly limit per category from the average of the previous full months. */
export function suggestBudgets(state: AppState, scope: string[], today: YMD, months = 3): Map<string, number> {
  const end = addDaysYMD(monthStart(monthOf(today)), -1);
  const startYm = (() => { const [y, m] = monthOf(today).split('-').map(Number); const d = new Date(y, m - 1 - months, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; })();
  // Only everyday spending — scheduled bills (rent, subscriptions) aren't "budgetable" habits.
  const sums = new Map<string, number>();
  const from = monthStart(startYm);
  for (const t of state.transactions) {
    if (t.type !== 'expense' || t.recurringId || t.dueId || t.date < from || t.date > end || !scope.includes(t.profileId)) continue;
    sums.set(t.categoryId ?? 'other', (sums.get(t.categoryId ?? 'other') ?? 0) + t.amount);
  }
  const out = new Map<string, number>();
  for (const [k, v] of sums) { const avg = v / months; if (avg >= 10) out.set(k, Math.round(avg / 5) * 5); }
  return out;
}

/* ───────── Convenience selectors ───────── */
export function upcomingDues(state: AppState, scope: string[]): Due[] {
  return inScope(state.dues, scope).filter((d) => d.status === 'open').sort((a, b) => a.date.localeCompare(b.date));
}

export function holdingGain(h: Holding) { return round2(h.value - h.invested); }
