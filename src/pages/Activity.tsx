import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Receipt, Search } from 'lucide-react';
import { addMonthsYM, monthEnd, monthOf, monthStart, relativeDay } from '../lib/dates';
import { inScope, monthTotals, spendByCategory } from '../lib/ledger';
import { useApp } from '../lib/store';
import { Donut } from '../ui/charts';
import { CatTile } from '../ui/Icon';
import { CountUp, Empty } from '../ui/kit';
import { TxRow } from '../ui/rows';
import { format } from 'date-fns';
import { parseYMD } from '../lib/dates';

export default function Activity() {
  const { state, scope, today, fmt, fmt0, openModal } = useApp();
  const [ym, setYm] = useState(monthOf(today));
  const [q, setQ] = useState('');
  const [type, setType] = useState<'all' | 'expense' | 'income' | 'transfer'>('all');
  const [cat, setCat] = useState<string | null>(null);
  const multi = scope.length > 1;
  const totals = useMemo(() => monthTotals(state, scope, ym), [state, scope, ym]);
  const byCat = useMemo(() => [...spendByCategory(state, scope, monthStart(ym), monthEnd(ym))].map(([id, v]) => ({ id, v, c: state.categories.find((c) => c.id === id) })).sort((a, b) => b.v - a.v), [state, scope, ym]);

  const txs = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return inScope(state.transactions, scope)
      .filter((t) => t.date <= today)
      .filter((t) => (needle ? true : t.date >= monthStart(ym) && t.date <= monthEnd(ym)))
      .filter((t) => type === 'all' || t.type === type)
      .filter((t) => !cat || t.categoryId === cat)
      .filter((t) => {
        if (!needle) return true;
        const c = state.categories.find((x) => x.id === t.categoryId)?.name ?? '';
        return `${t.note ?? ''} ${c} ${t.amount}`.toLowerCase().includes(needle);
      })
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
  }, [state, scope, ym, q, type, cat, today]);

  const groups = useMemo(() => {
    const m = new Map<string, typeof txs>();
    for (const t of txs) m.set(t.date, [...(m.get(t.date) ?? []), t]);
    return [...m];
  }, [txs]);

  const isCur = ym === monthOf(today);
  const top = byCat.slice(0, 6);
  const rest = byCat.slice(6).reduce((s, x) => s + x.v, 0);

  return (
    <>
      <div className="page-head reveal">
        <div className="titles">
          <h1 className="display">Activity</h1>
          <p className="subline">Every expense, paycheck and transfer — {txs.length} shown</p>
        </div>
        <div className="actions">
          <button className="btn" onClick={() => openModal('tx', { type: 'income' })}><Plus /> Income</button>
          <button className="btn primary" onClick={() => openModal('tx')}><Plus /> Expense</button>
        </div>
      </div>

      <div className="toolbar reveal" style={{ ['--d' as string]: '.04s' }}>
        <div className="month-nav">
          <button className="icon-btn" aria-label="Previous month" onClick={() => setYm(addMonthsYM(ym, -1))}><ChevronLeft /></button>
          <b>{format(parseYMD(monthStart(ym)), 'MMMM yyyy')}</b>
          <button className="icon-btn" aria-label="Next month" disabled={isCur} onClick={() => setYm(addMonthsYM(ym, 1))}><ChevronRight /></button>
        </div>
        <label className="search"><Search /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search all activity" aria-label="Search" /></label>
      </div>

      <div className="stats reveal" style={{ ['--d' as string]: '.08s', gridTemplateColumns: 'repeat(3, minmax(0,1fr))' }}>
        <div className="stat"><span className="eyebrow">Income</span><span className="v num pos"><CountUp value={totals.income} format={fmt0} /></span></div>
        <div className="stat"><span className="eyebrow">Spent</span><span className="v num"><CountUp value={totals.spent} format={fmt0} /></span></div>
        <div className="stat"><span className="eyebrow">{totals.saved >= 0 ? 'Saved' : 'Overspent'}</span><span className={`v num ${totals.saved >= 0 ? 'pos' : 'neg'}`}><CountUp value={Math.abs(totals.saved)} format={fmt0} /></span>
          {totals.income > 0 && <span className="d">{Math.round((totals.saved / totals.income) * 100)}% of income</span>}</div>
      </div>

      {byCat.length > 0 && (
        <section className="card reveal" style={{ ['--d' as string]: '.12s' }}>
          <div className="card-head"><h3>Where it went</h3>{cat && <button className="link-btn" onClick={() => setCat(null)}>Clear filter</button>}</div>
          <div className="breakdown">
            <Donut items={[...top.map((x) => ({ value: x.v, color: x.c?.color ?? '#8C8C99', label: x.c?.name })), ...(rest ? [{ value: rest, color: 'var(--dash)', label: 'Other' }] : [])]}>
              <span><span className="eyebrow">Spent</span><br /><b className="num" style={{ fontSize: 22, fontWeight: 400 }}>{fmt0(totals.spent)}</b></span>
            </Donut>
            <div className="legend-list">
              {byCat.slice(0, 7).map((x) => (
                <button key={x.id} className="legend-row" aria-pressed={cat === x.id} onClick={() => setCat(cat === x.id ? null : x.id)}>
                  <CatTile cat={x.c} size="sm" />
                  <span className="t">{x.c?.name ?? 'Other'}</span>
                  <span className="muted num" style={{ fontSize: 13 }}>{Math.round((x.v / (totals.spent || 1)) * 100)}%</span>
                  <b className="num" style={{ fontWeight: 500, minWidth: 70, textAlign: 'right' }}>{fmt(x.v)}</b>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      <div className="toolbar reveal" style={{ ['--d' as string]: '.16s' }}>
        <div className="chips">
          {(['all', 'expense', 'income', 'transfer'] as const).map((t) => (
            <button key={t} className="chip" aria-pressed={type === t} onClick={() => setType(t)}>{t === 'all' ? 'Everything' : t === 'expense' ? 'Expenses' : t === 'income' ? 'Income' : 'Transfers'}</button>
          ))}
        </div>
      </div>

      {groups.length ? (
        <section className="card flush reveal" style={{ ['--d' as string]: '.2s' }}>
          <div className="list">
            {groups.map(([date, list]) => {
              const day = list.reduce((s, t) => s + (t.type === 'expense' ? -t.amount : t.type === 'income' ? t.amount : 0), 0);
              return (
                <div key={date}>
                  <div className="li-group"><span>{relativeDay(date, today)}</span><span className="num">{day ? fmt(day, { sign: true }) : ''}</span></div>
                  {list.map((t) => <TxRow key={t.id} t={t} showOwner={multi} />)}
                </div>
              );
            })}
          </div>
        </section>
      ) : (
        <Empty icon={<Receipt />} title={q ? 'No matches' : 'Nothing here yet'} text={q ? 'Try a different search.' : 'Log an expense, a cash withdrawal or a paycheck and it will show up here.'} action={!q && <button className="btn primary" onClick={() => openModal('tx')}><Plus /> Add expense</button>} />
      )}
    </>
  );
}
