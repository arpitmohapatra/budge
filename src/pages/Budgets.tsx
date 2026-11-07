import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, PiggyBank, Wand2 } from 'lucide-react';
import { format } from 'date-fns';
import { addMonthsYM, daysInMonth, monthOf, parseYMD, monthStart } from '../lib/dates';
import { budgetRows, spendByCategory, suggestBudgets, uid } from '../lib/ledger';
import { monthEnd } from '../lib/dates';
import { useApp } from '../lib/store';
import { FAMILY } from '../lib/types';
import { CatTile } from '../ui/Icon';
import { CountUp, Empty, Ring } from '../ui/kit';
import { BudgetLine } from '../ui/rows';

export default function Budgets() {
  const { state, scope, today, view, fmt0, openModal, update } = useApp();
  const cur = monthOf(today);
  const [ym, setYm] = useState(cur);
  const rows = useMemo(() => budgetRows(state, scope, ym, today), [state, scope, ym, today]);
  const isCur = ym === cur;
  const dim = daysInMonth(ym);
  const dom = isCur ? Number(today.slice(8, 10)) : ym < cur ? dim : 0;
  const frac = ym < cur ? 1 : ym > cur ? 0 : dom / dim;
  const limit = rows.reduce((s, r) => s + r.limit, 0);
  const spent = rows.reduce((s, r) => s + r.spent, 0);
  const over = rows.filter((r) => r.state === 'over');
  const watch = rows.filter((r) => r.state === 'watch');
  const pct = limit ? spent / limit : 0;
  const unbudgeted = useMemo(() => {
    const ids = new Set(rows.map((r) => r.categoryId));
    return [...spendByCategory(state, scope, monthStart(ym), monthEnd(ym))].filter(([id]) => !ids.has(id)).map(([id, v]) => ({ id, v })).sort((a, b) => b.v - a.v);
  }, [state, scope, ym, rows]);
  const single = scope.length === 1;
  const suggestions = useMemo(() => (single ? suggestBudgets(state, scope, today) : new Map<string, number>()), [state, scope, today, single]);
  const missing = [...suggestions].filter(([id]) => !rows.some((r) => r.categoryId === id));
  const tone = over.length ? 'var(--neg)' : watch.length || pct > 0.85 ? 'var(--warn)' : 'var(--pos)';
  const left = limit - spent;
  const projected = isCur && frac > 0 ? spent / frac : spent;

  return (
    <>
      <div className="page-head reveal">
        <div className="titles">
          <h1 className="display">Budgets</h1>
          <p className="subline">{over.length ? <><b className="neg">{over.length} over</b>{watch.length ? <> · {watch.length} running hot</> : null}</> : watch.length ? <><b className="warn">{watch.length} running hot</b> — keep an eye on {watch.length > 1 ? 'them' : 'it'}</> : rows.length ? <><b className="pos">All on track</b> this month</> : 'Set monthly limits and see how you do'}</p>
        </div>
        <div className="actions"><button className="btn primary" onClick={() => openModal('budget')}><Plus /> New budget</button></div>
      </div>

      <div className="toolbar reveal" style={{ ['--d' as string]: '.04s' }}>
        <div className="month-nav">
          <button className="icon-btn" aria-label="Previous month" onClick={() => setYm(addMonthsYM(ym, -1))}><ChevronLeft /></button>
          <b>{format(parseYMD(monthStart(ym)), 'MMMM yyyy')}</b>
          <button className="icon-btn" aria-label="Next month" disabled={isCur} onClick={() => setYm(addMonthsYM(ym, 1))}><ChevronRight /></button>
        </div>
      </div>

      {rows.length > 0 ? (
        <>
          <section className="card budget-summary reveal" style={{ ['--d' as string]: '.08s' }}>
            <Ring pct={pct} size={112} stroke={11} color={tone}><span style={{ textAlign: 'center' }}><b className="num" style={{ fontSize: 26, fontWeight: 300 }}>{Math.round(pct * 100)}%</b><br /><span className="muted" style={{ fontSize: 11 }}>used</span></span></Ring>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
              <div className="eyebrow">{isCur ? `Day ${dom} of ${dim}` : 'Month total'}</div>
              <div className="num" style={{ fontSize: 36, fontWeight: 300, letterSpacing: '-.02em', lineHeight: 1.05 }}><CountUp value={spent} format={fmt0} /> <span className="muted" style={{ fontSize: 20 }}>of {fmt0(limit)}</span></div>
              <p className="help" style={{ fontSize: 14 }}>
                {left >= 0 ? <><b style={{ fontWeight: 500 }}>{fmt0(left)}</b> left</> : <b className="neg" style={{ fontWeight: 500 }}>{fmt0(-left)} over</b>}
                {isCur && dom >= 10 && frac < 1 && <> · on pace for <b style={{ fontWeight: 500 }} className={projected > limit ? 'neg' : ''}>{fmt0(projected)}</b></>}
                {isCur && dim - dom > 0 && left > 0 && <> · about {fmt0(left / (dim - dom))}/day for {dim - dom} more days</>}
              </p>
            </div>
          </section>

          {over.length > 0 && (
            <div className="callout bad reveal"><PiggyBank /> <span><b>{over.map((r) => state.categories.find((c) => c.id === r.categoryId)?.name).join(', ')}</b> {over.length > 1 ? 'are' : 'is'} past the limit. {isCur ? 'Consider moving some budget across or pausing spend there until next month.' : ''}</span></div>
          )}

          <section className="card flush reveal" style={{ ['--d' as string]: '.12s' }}>
            <div className="list">
              {rows.map((r) => (
                <BudgetLine key={r.categoryId} r={r} frac={isCur ? frac : undefined} onClick={r.budgetIds.length === 1 ? () => openModal('budget', { id: r.budgetIds[0] }) : undefined} />
              ))}
            </div>
          </section>
          {view === FAMILY && <p className="help">Family view adds everyone's limits together. Switch to a person to edit their budgets.</p>}
        </>
      ) : (
        <Empty icon={<PiggyBank />} title="No budgets yet" text="Pick a category — groceries, dining out, fun — and set a monthly limit. You'll see a bar fill up with a pace marker, and a heads-up if you're running hot." action={<div className="actions"><button className="btn primary" onClick={() => openModal('budget')}><Plus /> Create a budget</button></div>} />
      )}

      {missing.length > 0 && isCur && (
        <section className="card reveal">
          <div className="card-head"><div><h3>Suggested from your last 3 months</h3><span className="sub">Based on what you actually spend</span></div>
            <button className="btn small" onClick={() => update((s) => ({ ...s, budgets: [...s.budgets, ...missing.map(([categoryId, amount]) => ({ id: uid(), profileId: scope[0], categoryId, amount }))] }), { undo: `Added ${missing.length} budgets` })}><Wand2 /> Add all {missing.length}</button></div>
          <div className="chips">{missing.slice(0, 8).map(([id, v]) => { const c = state.categories.find((x) => x.id === id); return <button key={id} className="chip" onClick={() => openModal('budget', { categoryId: id, profileId: scope[0] })}><CatTile cat={c} size="sm" /> {c?.name} · {fmt0(v)}</button>; })}</div>
        </section>
      )}

      {unbudgeted.length > 0 && (
        <section className="stack reveal">
          <div className="section-head"><h3>Spending without a budget</h3></div>
          <div className="card flush"><div className="list">
            {unbudgeted.slice(0, 6).map((u) => { const c = state.categories.find((x) => x.id === u.id); return (
              <div key={u.id} className="li"><CatTile cat={c} /><span className="body"><span className="t">{c?.name}</span></span><span className="amt num">{fmt0(u.v)}</span>
                {single && <button className="btn small" onClick={() => openModal('budget', { categoryId: u.id })}>Set limit</button>}</div>
            ); })}
          </div></div>
        </section>
      )}
    </>
  );
}
