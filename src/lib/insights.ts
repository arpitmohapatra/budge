import { addDaysYMD, diffDays, fmtDate, monthOf } from './dates';
import { checkAffordability, forecast, type Forecast } from './forecast';
import { balances, budgetRows, catById, inScope, monthTotals } from './ledger';
import type { AppState, YMD } from './types';

export interface Insight {
  id: string;
  tone: 'good' | 'warn' | 'bad' | 'info';
  icon: string;
  title: string;
  body: string;
  route?: string;
}

type Fmt = (n: number) => string;

/** Short, actionable observations for the home screen. */
export function buildInsights(state: AppState, scope: string[], today: YMD, fmt: Fmt, fc?: Forecast): Insight[] {
  const out: Insight[] = [];
  const bal = balances(state, today);
  const f = fc ?? forecast(state, scope, 60, today, bal);
  const buffer = state.settings.buffer;

  // 1. Cash running low
  const acctName = (id: string) => state.accounts.find((a) => a.id === id)?.name ?? 'an account';
  if (f.accountLows.length) {
    const l = f.accountLows[0];
    out.push({ id: 'acct-neg', tone: 'bad', icon: 'alert', title: `${l.name} dips below zero`, body: `Projected ${fmt(l.balance)} on ${fmtDate(l.date)}. Move money in before then, or shift a due date.`, route: '/forecast' });
  } else if (f.low.balance < buffer && f.hasPrimary) {
    out.push({ id: 'low', tone: 'warn', icon: 'warn', title: 'Cash gets tight', body: `Your lowest point is ${fmt(f.low.balance)} on ${fmtDate(f.low.date)} — under your ${fmt(buffer)} cushion.`, route: '/forecast' });
  } else if (f.hasPrimary && f.events.some((e) => e.kind === 'income')) {
    out.push({ id: 'ok', tone: 'good', icon: 'sun', title: 'Smooth sailing for 60 days', body: `You never drop below ${fmt(f.low.balance)}, and end the period at ${fmt(f.end)}.`, route: '/forecast' });
  }

  // 2. Budgets
  const cur = monthOf(today);
  const rows = budgetRows(state, scope, cur, today);
  const over = rows.filter((r) => r.state === 'over');
  const watch = rows.filter((r) => r.state === 'watch');
  if (over.length) {
    const r = over[0];
    const c = catById(state, r.categoryId);
    out.push({ id: 'over', tone: 'bad', icon: c?.icon ?? 'alert', title: over.length > 1 ? `${over.length} budgets are over` : `${c?.name ?? 'A budget'} is over budget`, body: `${fmt(r.spent - r.limit)} past the ${fmt(r.limit)} limit${over.length > 1 ? ` (plus ${over.length - 1} more)` : ''}.`, route: '/budgets' });
  }
  if (watch.length && !over.length) {
    const r = watch[0];
    const c = catById(state, r.categoryId);
    out.push({ id: 'watch', tone: 'warn', icon: c?.icon ?? 'warn', title: `${c?.name ?? 'A budget'} is running hot`, body: r.projected > r.limit ? `At this pace you'll reach ${fmt(r.projected)} against a ${fmt(r.limit)} limit.` : `${Math.round(r.pct * 100)}% used, ${fmt(r.remaining)} left.`, route: '/budgets' });
  }

  // 3. Big bill in the next 3 days
  const soon = f.events.filter((e) => e.amount < 0 && diffDays(e.date, today) <= 3).sort((a, b) => a.amount - b.amount)[0];
  if (soon && -soon.amount >= 100) {
    out.push({ id: 'soon', tone: 'info', icon: 'calendar', title: `${soon.label} · ${fmt(-soon.amount)}`, body: `Leaves ${acctName(soon.accountId)} on ${fmtDate(soon.date, 'EEE, MMM d')}.`, route: '/bills' });
  }

  // 4. Credit utilisation
  for (const a of inScope(state.accounts, scope)) {
    if (a.kind !== 'credit' || a.archived || !a.limit) continue;
    const used = -bal[a.id] / a.limit;
    if (used > 0.3) { out.push({ id: `util-${a.id}`, tone: 'warn', icon: 'card', title: `${a.name} is at ${Math.round(used * 100)}% of its limit`, body: 'Keeping utilisation under 30% is kind to your credit score.', route: '/accounts' }); break; }
  }

  // 5. Savings rate last full month
  const prev = monthOf(addDaysYMD(`${cur}-01`, -1));
  const t = monthTotals(state, scope, prev);
  if (t.income > 0 && t.saved > 0) {
    out.push({ id: 'saved', tone: 'good', icon: 'target', title: `You kept ${Math.round((t.saved / t.income) * 100)}% of your income last month`, body: `${fmt(t.saved)} saved out of ${fmt(t.income)} earned.`, route: '/activity' });
  } else if (t.income > 0 && t.saved < 0) {
    out.push({ id: 'deficit', tone: 'warn', icon: 'trend-down', title: 'You spent more than you earned last month', body: `${fmt(-t.saved)} over — worth a look at where it went.`, route: '/activity' });
  }

  // 6. Planned purchases
  const mine = state.planned.filter((p) => (scope.length > 1 ? p.scope === 'family' : p.scope === scope[0])).sort((a, b) => a.date.localeCompare(b.date));
  if (mine.length) {
    const p = mine[0];
    const days = Math.max(diffDays(p.date, today) + 30, 90);
    const f2 = forecast(state, scope, Math.min(365, days), today, bal);
    const a = checkAffordability(f2, p.amount, p.date < today ? today : p.date, buffer);
    if (a.verdict !== 'yes') out.push({ id: 'plan', tone: a.verdict === 'no' ? 'bad' : 'warn', icon: 'bag', title: `${p.name} ${a.verdict === 'no' ? "doesn't fit yet" : 'would be tight'}`, body: a.earliest ? `You could comfortably buy it on ${fmtDate(a.earliest, 'MMM d')}.` : 'Not within the forecast window at your current pace.', route: '/forecast' });
  }

  const order = { bad: 0, warn: 1, info: 2, good: 3 } as const;
  return out.sort((a, b) => order[a.tone] - order[b.tone]).slice(0, 5);
}
