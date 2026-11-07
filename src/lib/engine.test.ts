import { describe, expect, it } from 'vitest';
import { occurrencesBetween } from './dates';
import { isBusinessDay, rollBackToBusinessDay } from './holidays';
import { checkAffordability, forecast, safeToSpend } from './forecast';
import { balances, budgetRows, DEFAULT_CATEGORIES, materialize, totals } from './ledger';
import type { AppState, Transaction } from './types';

const TODAY = '2026-11-07';

function base(over: Partial<AppState> = {}): AppState {
  return {
    v: 2, onboarded: true,
    profiles: [{ id: 'me', name: 'Me', color: '#000' }, { id: 'wife', name: 'Wife', color: '#111' }],
    accounts: [
      { id: 'chk', profileId: 'me', name: 'Checking', kind: 'checking', startingBalance: 1000, startDate: '2026-10-01', primary: true },
      { id: 'card', profileId: 'me', name: 'Visa', kind: 'credit', startingBalance: -400, startDate: '2026-10-01' },
      { id: 'wchk', profileId: 'wife', name: 'Wife checking', kind: 'checking', startingBalance: 500, startDate: '2026-10-01', primary: true },
    ],
    transactions: [], recurring: [], dues: [], budgets: [], holdings: [], planned: [],
    categories: DEFAULT_CATEGORIES,
    settings: { currency: 'USD', buffer: 500, windowDays: 60, dailyOverride: { me: 20, wife: 0 }, includeSavings: true, theme: 'auto' },
    ...over,
  };
}
const tx = (o: Partial<Transaction>): Transaction => ({ id: Math.random().toString(), profileId: 'me', type: 'expense', amount: 0, date: TODAY, accountId: 'chk', createdAt: 0, ...o });

describe('recurrence', () => {
  it('keeps the anchor day across short months', () => {
    expect(occurrencesBetween('2026-01-31', 'monthly', '2026-01-01', '2026-04-30')).toEqual(['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30']);
  });
  it('biweekly from a past anchor lands on the right days', () => {
    expect(occurrencesBetween('2026-10-09', 'biweekly', '2026-11-07', '2026-12-10')).toEqual(['2026-11-20', '2026-12-04']);
  });
  it('never returns dates before the anchor, respects endDate', () => {
    expect(occurrencesBetween('2026-11-20', 'weekly', '2026-11-01', '2026-12-31', '2026-12-04')).toEqual(['2026-11-20', '2026-11-27', '2026-12-04']);
  });
});

describe('pay days: 7th & 22nd, rolled back off weekends/holidays', () => {
  const PAY = { days: [7, 22] as [number, number], rollBack: true };
  it('moves a Saturday/Sunday payday to the Friday before', () => {
    // Nov 7 2026 is a Saturday, Nov 22 2026 is a Sunday
    expect(occurrencesBetween('2026-01-01', 'semimonthly', '2026-11-01', '2026-11-30', undefined, PAY)).toEqual(['2026-11-06', '2026-11-20']);
  });
  it('keeps weekday paydays as-is', () => {
    // Dec 7 2026 = Monday, Dec 22 = Tuesday
    expect(occurrencesBetween('2026-01-01', 'semimonthly', '2026-12-01', '2026-12-31', undefined, PAY)).toEqual(['2026-12-07', '2026-12-22']);
  });
  it('treats US holidays like weekends (Jul 7→ no; Jan 22 → no; but a holiday payday rolls back)', () => {
    expect(isBusinessDay('2026-11-26')).toBe(false); // Thanksgiving
    expect(isBusinessDay('2027-07-05')).toBe(false); // Jul 4 2027 is Sunday → observed Monday
    expect(rollBackToBusinessDay('2026-11-26')).toBe('2026-11-25');
    expect(rollBackToBusinessDay('2027-07-05')).toBe('2027-07-02'); // Mon holiday → Fri before the long weekend
    // Labor Day 2026 is Sep 7 — a Monday holiday that is also a payday → paid Friday Sep 4
    expect(occurrencesBetween('2026-01-01', 'semimonthly', '2026-09-01', '2026-09-30', undefined, PAY)).toEqual(['2026-09-04', '2026-09-22']);
  });
  it('is stable regardless of window edges (no duplicates, nothing missed)', () => {
    const all = occurrencesBetween('2026-01-01', 'semimonthly', '2026-01-01', '2026-12-31', undefined, PAY);
    expect(all).toHaveLength(24);
    expect(new Set(all).size).toBe(24);
    const pieces = ['2026-01-01|2026-03-15', '2026-03-16|2026-08-31', '2026-09-01|2026-12-31'].flatMap((r) => { const [a, b] = r.split('|'); return occurrencesBetween('2026-01-01', 'semimonthly', a, b, undefined, PAY); });
    expect(pieces).toEqual(all);
  });
});

describe('balances', () => {
  it('applies expenses, income, transfers (card payments) and respects startDate / future dates', () => {
    const s = base({
      transactions: [
        tx({ type: 'expense', amount: 100 }),
        tx({ type: 'income', amount: 2000, date: '2026-11-01' }),
        tx({ type: 'transfer', amount: 250, accountId: 'chk', toAccountId: 'card' }),
        tx({ type: 'expense', amount: 999, date: '2026-09-15' }), // before startDate → ignored
        tx({ type: 'expense', amount: 999, date: '2026-11-20' }), // future → ignored
        tx({ type: 'expense', amount: 60, accountId: 'card' }), // charge on card → owe more
        tx({ type: 'adjust', amount: -5 }),
      ],
    });
    const b = balances(s, TODAY);
    expect(b.chk).toBe(1000 - 100 + 2000 - 250 - 5);
    expect(b.card).toBe(-400 + 250 - 60);
    const t = totals(s, ['me'], b);
    expect(t.liquid).toBe(b.chk);
    expect(t.cardDebt).toBe(210);
    expect(t.netWorth).toBe(b.chk - 210);
  });
});

describe('materialize', () => {
  const s = base({
    recurring: [
      { id: 'pay', profileId: 'me', kind: 'income', name: 'Paycheck', amount: 2000, frequency: 'semimonthly', days: [7, 22], rollBack: true, anchor: '2026-01-01', postedThrough: '2026-11-05', accountId: 'chk', active: true },
      { id: 'rent', profileId: 'me', kind: 'expense', name: 'Rent', amount: 1500, frequency: 'monthly', anchor: '2026-12-01', postedThrough: '2026-11-06', accountId: 'chk', categoryId: 'housing', active: true },
    ],
    dues: [
      { id: 'd1', profileId: 'me', name: 'Visa payment', amount: 300, date: '2026-11-07', accountId: 'card', payFromId: 'chk', status: 'open' },
      { id: 'd2', profileId: 'me', name: 'Future', amount: 50, date: '2026-11-20', accountId: 'card', payFromId: 'chk', status: 'open' },
    ],
  });
  it('posts the (rolled-back) paycheck and today’s due once (idempotent) and leaves the future alone', () => {
    const r1 = materialize(s, TODAY); // payday is Fri Nov 6 because the 7th is a Saturday
    expect(r1.created.map((t) => t.note).sort()).toEqual(['Paycheck', 'Visa payment']);
    const r2 = materialize(r1.state, TODAY);
    expect(r2.created).toHaveLength(0);
    expect(r2.state).toBe(r1.state);
    const b = balances(r1.state, TODAY);
    expect(b.chk).toBe(1000 + 2000 - 300);
    expect(b.card).toBe(-400 + 300);
    expect(r1.state.dues.find((d) => d.id === 'd1')?.status).toBe('paid');
    expect(r1.state.dues.find((d) => d.id === 'd2')?.status).toBe('open');
  });
  it('catches up on several missed paychecks after the app was closed', () => {
    const r = materialize(s, '2026-12-10');
    expect(r.created.filter((t) => t.note === 'Paycheck').map((t) => t.date)).toEqual(['2026-11-06', '2026-11-20', '2026-12-07']);
    expect(r.created.filter((t) => t.note === 'Rent').map((t) => t.date)).toEqual(['2026-12-01']);
  });
});

describe('forecast & affordability', () => {
  const s = base({
    recurring: [
      { id: 'pay', profileId: 'me', kind: 'income', name: 'Paycheck', amount: 2000, frequency: 'semimonthly', days: [7, 22], rollBack: true, anchor: '2026-01-01', postedThrough: TODAY, accountId: 'chk', active: true },
      { id: 'rent', profileId: 'me', kind: 'expense', name: 'Rent', amount: 1500, frequency: 'monthly', anchor: '2026-12-01', postedThrough: TODAY, accountId: 'chk', active: true },
    ],
    dues: [{ id: 'd', profileId: 'me', name: 'Visa', amount: 300, date: '2026-11-20', accountId: 'card', payFromId: 'chk', status: 'open' }],
  });
  const fc = forecast(s, ['me'], 30, TODAY);
  it('projects the end balance and the low point', () => {
    expect(fc.start).toBe(1000);
    expect(fc.end).toBe(1000 + 4000 - 300 - 1500 - 600); // 2 paychecks, due, rent, 30d × $20
    expect(fc.low).toMatchObject({ date: '2026-12-06', balance: 620 }); // the day before Dec 7 payday, after rent
    expect(fc.income).toBe(4000);
    expect(fc.bills).toBe(1800);
  });
  it('family scope adds the other profile’s cash', () => {
    expect(forecast(s, ['me', 'wife'], 5, TODAY).start).toBe(1500);
  });
  it('says yes / tight / no and when you could afford it', () => {
    expect(checkAffordability(fc, 100, TODAY, 500).verdict).toBe('yes');     // low 520 ≥ 500
    const tight = checkAffordability(fc, 400, TODAY, 500);
    expect(tight.verdict).toBe('tight');                                      // low 220
    expect(tight.earliest).toBe('2026-12-07');                                // after the Dec 7 payday
    expect(checkAffordability(fc, 3000, TODAY, 500).verdict).toBe('no');
    expect(checkAffordability(fc, 400, '2026-12-07', 500).verdict).toBe('yes');
    expect(checkAffordability(fc, 1, TODAY, 500).maxAmount).toBe(120);
  });
  it('safe-to-spend subtracts bills due before payday', () => {
    const r = safeToSpend(s, ['me'], TODAY);
    expect(r.payday).toBe(true);
    expect(r.untilDate).toBe('2026-11-20'); // the 22nd is a Sunday → paid Friday
    expect(r.days).toBe(13);
    expect(r.safe).toBe(1000);
  });
});

describe('budgets', () => {
  it('flags over / watch / ok and handles family sums', () => {
    const s = base({
      budgets: [
        { id: 'b1', profileId: 'me', categoryId: 'dining', amount: 100 },
        { id: 'b2', profileId: 'wife', categoryId: 'dining', amount: 100 },
        { id: 'b3', profileId: 'me', categoryId: 'groceries', amount: 500 },
        { id: 'b4', profileId: 'me', categoryId: 'fun', amount: 100 },
      ],
      transactions: [
        tx({ amount: 120, categoryId: 'dining', date: '2026-11-03' }),
        tx({ amount: 95, categoryId: 'dining', profileId: 'wife', accountId: 'wchk', date: '2026-11-04' }),
        tx({ amount: 90, categoryId: 'groceries', date: '2026-11-04' }),
        tx({ amount: 90, categoryId: 'fun', date: '2026-11-05' }),
      ],
    });
    const me = budgetRows(s, ['me'], '2026-11', TODAY);
    expect(me.find((r) => r.categoryId === 'dining')?.state).toBe('over');
    expect(me.find((r) => r.categoryId === 'fun')?.state).toBe('watch');
    expect(me.find((r) => r.categoryId === 'groceries')?.state).toBe('ok');
    const fam = budgetRows(s, ['me', 'wife'], '2026-11', TODAY).find((r) => r.categoryId === 'dining')!;
    expect(fam).toMatchObject({ limit: 200, spent: 215, state: 'over' });
  });
});
