import { describe, expect, it } from 'vitest';
import { demoState } from './demo';
import { forecast, safeToSpend } from './forecast';
import { balances, budgetRows, materialize } from './ledger';
import { parseQuick } from './quickparse';
import { DEFAULT_CATEGORIES } from './ledger';

const TODAY = '2026-11-07';

describe('quick log parsing', () => {
  const st = { categories: DEFAULT_CATEGORIES };
  it('reads amount, relative date and a category guess', () => {
    const p = parseQuick('starbucks coffee 6.40 yesterday', st, TODAY);
    expect(p).toMatchObject({ amount: 6.4, date: '2026-11-06', categoryId: 'dining', isIncome: false });
  });
  it('treats +amount and pay words as income', () => {
    expect(parseQuick('+250 bonus', st, TODAY)).toMatchObject({ amount: 250, isIncome: true, categoryId: 'bonus' });
  });
  it('maps cash withdrawals to Cash & ATM, handles thousands separators and weekday names', () => {
    expect(parseQuick('ATM withdrawal $1,200 mon', st, TODAY)).toMatchObject({ amount: 1200, categoryId: 'cash', date: '2026-11-02' });
  });
});

describe('sample household end-to-end', () => {
  const s = demoState(TODAY, ['A', 'B']);
  it('pins today’s balances exactly and has nothing left to post', () => {
    const b = balances(s, TODAY);
    expect(b.a1).toBe(4325.4);
    expect(b.a3).toBe(-1240.18);
    expect(b.b1).toBe(2856.3);
    expect(materialize(s, TODAY).created).toHaveLength(0);
  });
  it('forecast and safe-to-spend are finite and respect the 7th/22nd pay rule', () => {
    const fc = forecast(s, s.profiles.map((p) => p.id), 90, TODAY);
    expect(Number.isFinite(fc.end)).toBe(true);
    const pays = fc.events.filter((e) => e.kind === 'income' && e.profileId === 'p1').map((e) => e.date);
    expect(pays.slice(0, 4)).toEqual(['2026-11-20', '2026-12-07', '2026-12-22', '2027-01-07']);
    const sts = safeToSpend(s, ['p1'], TODAY);
    expect(sts.untilDate).toBe('2026-11-20');
  });
  it('shows an over-budget state for dining in the sample', () => {
    const rows = budgetRows(s, ['p1'], '2026-11', TODAY);
    expect(rows.find((r) => r.categoryId === 'dining')?.state).toBe('over');
  });
  it('paying a due the day it lands deducts the bank and lowers the card', () => {
    const withDue = { ...s, dues: [...s.dues, { id: 'x', profileId: 'p1', name: 'Visa', amount: 100, date: TODAY, accountId: 'a3', payFromId: 'a1', status: 'open' as const }] };
    const r = materialize(withDue, TODAY);
    const b = balances(r.state, TODAY);
    expect(b.a1).toBe(4225.4);
    expect(b.a3).toBe(-1140.18);
  });
});
