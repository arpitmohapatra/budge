import { addDaysYMD, diffDays, occurrencesBetween, parseYMD } from './dates';
import { balances, DEFAULT_CATEGORIES, PROFILE_COLORS, round2 } from './ledger';
import type { Account, AppState, Holding, Recurring, Snapshot, Transaction, YMD } from './types';

export const defaultSettings = (): AppState['settings'] => ({
  currency: 'USD', buffer: 500, windowDays: 60, dailyOverride: {}, includeSavings: false, theme: 'auto',
});

export function emptyState(): AppState {
  return {
    v: 2, onboarded: false,
    profiles: [{ id: 'p1', name: 'Me', color: PROFILE_COLORS[0] }, { id: 'p2', name: 'Wife', color: PROFILE_COLORS[1] }],
    accounts: [], transactions: [], recurring: [], dues: [], budgets: [], holdings: [], planned: [],
    categories: DEFAULT_CATEGORIES, settings: defaultSettings(),
  };
}

function rng(seed: number) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

/** A realistic two-person household, generated relative to `today`, so every screen has something to show. */
export function demoState(today: YMD, names: [string, string] = ['Me', 'Wife']): AppState {
  const r = rng(7);
  const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)];
  const between = (a: number, b: number) => round2(a + r() * (b - a));
  const back = (n: number) => addDaysYMD(today, -n);
  const startDate = back(100);
  const P1 = 'p1', P2 = 'p2';

  const acc = (id: string, profileId: string, name: string, kind: Account['kind'], extra: Partial<Account> = {}): Account =>
    ({ id, profileId, name, kind, startingBalance: 0, startDate, ...extra });
  const accounts: Account[] = [
    acc('a1', P1, 'Chase Checking', 'checking', { primary: true, last4: '4821' }),
    acc('a2', P1, 'Ally Savings', 'savings', { last4: '9034' }),
    acc('a3', P1, 'Sapphire Visa', 'credit', { limit: 8000, last4: '1188' }),
    acc('a4', P1, 'Wallet', 'cash'),
    acc('b1', P2, 'BofA Checking', 'checking', { primary: true, last4: '7710' }),
    acc('b2', P2, 'Marcus Savings', 'savings', { last4: '2265' }),
    acc('b3', P2, 'Amex Gold', 'credit', { limit: 6000, last4: '3009' }),
  ];

  const txs: Transaction[] = [];
  const add = (t: Partial<Transaction> & Pick<Transaction, 'profileId' | 'type' | 'amount' | 'date' | 'accountId'>) =>
    txs.push({ id: `d${txs.length}`, createdAt: 0, ...t });

  // Pay & fixed bills over the last ~100 days
  // Both of us are paid on the 7th & 22nd (the business day before when it lands on a weekend/holiday).
  const PAY = { days: [7, 22] as [number, number], rollBack: true };
  for (const d of occurrencesBetween(startDate, 'semimonthly', startDate, today, undefined, PAY)) {
    add({ profileId: P1, type: 'income', amount: 2980, date: d, accountId: 'a1', categoryId: 'paycheck', note: 'Paycheck' });
    add({ profileId: P2, type: 'income', amount: 2340, date: d, accountId: 'b1', categoryId: 'paycheck', note: 'Paycheck' });
  }
  const monthly = (day: number, fn: (d: YMD) => void) => {
    for (let m = 0; m < 5; m++) {
      const t0 = parseYMD(today);
      const d = new Date(t0.getFullYear(), t0.getMonth() - m, day);
      const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (ymd <= today && ymd >= startDate) fn(ymd);
    }
  };
  monthly(1, (d) => add({ profileId: P1, type: 'expense', amount: 2150, date: d, accountId: 'a1', categoryId: 'housing', note: 'Rent', recurringId: 'r-rent' }));
  monthly(3, (d) => add({ profileId: P1, type: 'expense', amount: 142, date: d, accountId: 'a1', categoryId: 'insurance', note: 'Car insurance', recurringId: 'r-ins' }));
  monthly(5, (d) => add({ profileId: P1, type: 'expense', amount: 70, date: d, accountId: 'a1', categoryId: 'utilities', note: 'Internet', recurringId: 'r-net' }));
  monthly(12, (d) => add({ profileId: P1, type: 'expense', amount: 15.49, date: d, accountId: 'a3', categoryId: 'subscriptions', note: 'Netflix', recurringId: 'r-nf' }));
  monthly(9, (d) => add({ profileId: P2, type: 'expense', amount: 11.99, date: d, accountId: 'b3', categoryId: 'subscriptions', note: 'Spotify Family', recurringId: 'r-sp' }));
  monthly(14, (d) => add({ profileId: P2, type: 'expense', amount: 45, date: d, accountId: 'b1', categoryId: 'health', note: 'Gym', recurringId: 'r-gym' }));

  // Everyday spending
  const groc = ['Trader Joe’s', 'Costco', 'Whole Foods', 'Safeway'];
  const din = ['Chipotle', 'Starbucks', 'Thai Basil', 'Pizza night', 'Sushi', 'Brunch'];
  for (let i = 0; i < 100; i++) {
    const d = back(i);
    if (r() < 0.38) add({ profileId: P1, type: 'expense', amount: between(28, 96), date: d, accountId: pick(['a1', 'a3']), categoryId: 'groceries', note: pick(groc) });
    if (r() < 0.42) add({ profileId: pick([P1, P2]), type: 'expense', amount: between(6, 48), date: d, accountId: pick(['a3', 'b3', 'a1']), categoryId: 'dining', note: pick(din) });
    if (r() < 0.14) add({ profileId: P1, type: 'expense', amount: between(32, 58), date: d, accountId: 'a3', categoryId: 'transport', note: 'Gas' });
    if (r() < 0.13) add({ profileId: P2, type: 'expense', amount: between(22, 140), date: d, accountId: 'b3', categoryId: 'shopping', note: pick(['Amazon', 'Zara', 'Target', 'Sephora']) });
    if (r() < 0.08) add({ profileId: P2, type: 'expense', amount: between(15, 80), date: d, accountId: 'b1', categoryId: 'health', note: pick(['CVS', 'Dentist copay', 'Pharmacy']) });
    if (r() < 0.07) add({ profileId: P1, type: 'expense', amount: between(20, 70), date: d, accountId: 'a3', categoryId: 'fun', note: pick(['Movie night', 'Bowling', 'Concert tickets']) });
    if (r() < 0.045) add({ profileId: P1, type: 'expense', amount: pick([40, 60, 100]), date: d, accountId: 'a1', categoryId: 'cash', note: 'ATM withdrawal' });
  }
  // Make this month interesting: a blown dining budget, a hot fun budget.
  add({ profileId: P1, type: 'expense', amount: 142, date: back(2), accountId: 'a3', categoryId: 'dining', note: 'Anniversary dinner' });
  add({ profileId: P1, type: 'expense', amount: 84, date: back(3), accountId: 'a3', categoryId: 'fun', note: 'Comedy show' });

  // Past card payments so cards look lived-in
  for (let m = 1; m <= 3; m++) {
    add({ profileId: P1, type: 'transfer', amount: 980 + m * 40, date: back(m * 30 - 5), accountId: 'a1', toAccountId: 'a3', note: 'Visa payment' });
    add({ profileId: P2, type: 'transfer', amount: 540 + m * 25, date: back(m * 30 - 9), accountId: 'b1', toAccountId: 'b3', note: 'Amex payment' });
  }

  // Pin today's balances exactly, whatever the random history did.
  const target: Record<string, number> = { a1: 4325.4, a2: 12500, a3: -1240.18, a4: 85, b1: 2856.3, b2: 6200, b3: -618.45 };
  const tmp: AppState = { ...emptyState(), accounts, transactions: txs };
  const delta = balances(tmp, today);
  for (const a of accounts) a.startingBalance = round2(target[a.id] - delta[a.id]);

  const recurring: Recurring[] = [
    { id: 'r-pay1', profileId: P1, kind: 'income', name: 'Paycheck', amount: 2980, frequency: 'semimonthly', days: [7, 22], rollBack: true, anchor: startDate, postedThrough: today, accountId: 'a1', categoryId: 'paycheck', active: true },
    { id: 'r-pay2', profileId: P2, kind: 'income', name: 'Paycheck', amount: 2340, frequency: 'semimonthly', days: [7, 22], rollBack: true, anchor: startDate, postedThrough: today, accountId: 'b1', categoryId: 'paycheck', active: true },
    { id: 'r-rent', profileId: P1, kind: 'expense', name: 'Rent', amount: 2150, frequency: 'monthly', anchor: nextDay(today, 1), postedThrough: today, accountId: 'a1', categoryId: 'housing', active: true },
    { id: 'r-ins', profileId: P1, kind: 'expense', name: 'Car insurance', amount: 142, frequency: 'monthly', anchor: nextDay(today, 3), postedThrough: today, accountId: 'a1', categoryId: 'insurance', active: true },
    { id: 'r-net', profileId: P1, kind: 'expense', name: 'Internet', amount: 70, frequency: 'monthly', anchor: nextDay(today, 5), postedThrough: today, accountId: 'a1', categoryId: 'utilities', active: true },
    { id: 'r-nf', profileId: P1, kind: 'expense', name: 'Netflix', amount: 15.49, frequency: 'monthly', anchor: nextDay(today, 12), postedThrough: today, accountId: 'a3', categoryId: 'subscriptions', active: true },
    { id: 'r-sp', profileId: P2, kind: 'expense', name: 'Spotify Family', amount: 11.99, frequency: 'monthly', anchor: nextDay(today, 9), postedThrough: today, accountId: 'b3', categoryId: 'subscriptions', active: true },
    { id: 'r-gym', profileId: P2, kind: 'expense', name: 'Gym', amount: 45, frequency: 'monthly', anchor: nextDay(today, 14), postedThrough: today, accountId: 'b1', categoryId: 'health', active: true },
    { id: 'r-icl', profileId: P1, kind: 'expense', name: 'iCloud+ 2TB', amount: 9.99, frequency: 'monthly', anchor: addDaysYMD(today, 6), postedThrough: today, accountId: 'a3', categoryId: 'subscriptions', active: true },
    { id: 'r-ph', profileId: P2, kind: 'expense', name: 'Phone plan', amount: 85, frequency: 'monthly', anchor: addDaysYMD(today, 11), postedThrough: today, accountId: 'b1', categoryId: 'utilities', active: true },
  ];

  const snaps = (start: number, end: number, invStart: number, invEnd: number): Snapshot[] =>
    Array.from({ length: 7 }, (_, i) => {
      const f = i / 6;
      const wobble = Math.sin(i * 1.7) * (end - start) * 0.05;
      return { date: addDaysYMD(today, -(6 - i) * 30), value: round2(start + (end - start) * f + wobble * (i === 6 ? 0 : 1)), invested: round2(invStart + (invEnd - invStart) * f) };
    });
  const holding = (id: string, profileId: string, name: string, kind: Holding['kind'], s: [number, number, number, number]): Holding =>
    ({ id, profileId, name, kind, invested: s[3], value: s[1], snapshots: snaps(...s), createdAt: 0 });

  const holdings: Holding[] = [
    holding('h1', P1, 'Fidelity 401(k)', 'retirement', [41200, 46850, 36000, 39600]),
    holding('h2', P1, 'Vanguard VTI', 'etf', [12900, 14320, 11200, 12000]),
    holding('h3', P1, 'Bitcoin', 'crypto', [1500, 2310, 1500, 1500]),
    holding('h4', P2, 'Roth IRA', 'retirement', [15100, 17880, 13000, 14400]),
    holding('h5', P2, 'Index fund (FXAIX)', 'mutual-fund', [6200, 7140, 5600, 6000]),
  ];

  return {
    ...emptyState(), onboarded: true,
    profiles: [{ id: P1, name: names[0], color: PROFILE_COLORS[0] }, { id: P2, name: names[1], color: PROFILE_COLORS[1] }],
    accounts, transactions: txs, recurring, holdings,
    dues: [
      { id: 'du1', profileId: P1, name: 'Sapphire Visa statement', amount: 760, date: addDaysYMD(today, 9), accountId: 'a3', payFromId: 'a1', status: 'open' },
      { id: 'du2', profileId: P2, name: 'Amex Gold statement', amount: 410, date: addDaysYMD(today, 4), accountId: 'b3', payFromId: 'b1', status: 'open' },
      { id: 'du3', profileId: P1, name: 'Property tax', amount: 640, date: addDaysYMD(today, 19), payFromId: 'a1', categoryId: 'housing', status: 'open' },
    ],
    budgets: [
      { id: 'bu1', profileId: P1, categoryId: 'groceries', amount: 650 },
      { id: 'bu2', profileId: P1, categoryId: 'dining', amount: 150 },
      { id: 'bu3', profileId: P1, categoryId: 'fun', amount: 100 },
      { id: 'bu4', profileId: P1, categoryId: 'transport', amount: 220 },
      { id: 'bu5', profileId: P2, categoryId: 'shopping', amount: 300 },
      { id: 'bu6', profileId: P2, categoryId: 'health', amount: 150 },
      { id: 'bu7', profileId: P2, categoryId: 'dining', amount: 120 },
    ],
    planned: [
      { id: 'pl1', scope: 'family', name: 'OLED TV', amount: 1400, date: addDaysYMD(today, 10) },
      { id: 'pl2', scope: 'family', name: 'Hawaii trip', amount: 3800, date: addDaysYMD(today, 75) },
    ],
  };
}

/** Next calendar occurrence of day-of-month `day` strictly after today. */
function nextDay(today: YMD, day: number): YMD {
  const t = parseYMD(today);
  let d = new Date(t.getFullYear(), t.getMonth(), day);
  if (diffDays(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`, today) <= 0) d = new Date(t.getFullYear(), t.getMonth() + 1, day);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
