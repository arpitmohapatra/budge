import { useMemo, useState } from 'react';
import { ArrowRight, CornerDownLeft, Plus, Sparkles, Wallet, Wand2 } from 'lucide-react';
import { addDaysYMD, daysInMonth, fmtDate, monthOf } from '../lib/dates';
import { useForecast, useSafeToSpend } from '../lib/hooks';
import { buildInsights } from '../lib/insights';
import { budgetRows, inScope, primaryAccount, totals, uid } from '../lib/ledger';
import { parseQuick } from '../lib/quickparse';
import { useApp } from '../lib/store';
import { FAMILY } from '../lib/types';
import { ForecastChart } from '../ui/charts';
import { Icon } from '../ui/Icon';
import { Avatar, CountUp, Empty } from '../ui/kit';
import { BudgetLine, TxRow, UpcomingRow } from '../ui/rows';
import { navigate } from '../ui/router';

function greeting() {
  const h = new Date().getHours();
  return h < 5 ? 'Still up' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

export default function Home() {
  const { state, scope, today, bal, view, setView, fmt, fmt0, openModal, update, celebrate } = useApp();
  const fc = useForecast(60);
  const sts = useSafeToSpend();
  const t = useMemo(() => totals(state, scope, bal), [state, scope, bal]);
  const insights = useMemo(() => buildInsights(state, scope, today, fmt0, fc), [state, scope, today, fmt0, fc]);
  const budgets = useMemo(() => budgetRows(state, scope, monthOf(today), today), [state, scope, today]);
  const frac = Number(today.slice(8, 10)) / daysInMonth(monthOf(today));
  const recent = useMemo(() => inScope(state.transactions, scope).filter((x) => x.date <= today).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt).slice(0, 6), [state.transactions, scope, today]);
  const upcoming = fc.events.filter((e) => e.date <= addDaysYMD(today, 21)).slice(0, 6);
  const multi = scope.length > 1;
  const who = view === FAMILY ? null : state.profiles.find((p) => p.id === view);
  const noAccounts = !inScope(state.accounts, scope).length;

  // quick log
  const [q, setQ] = useState('');
  const parsed = useMemo(() => (q.trim() ? parseQuick(q, state, today) : null), [q, state, today]);
  const submitQuick = () => {
    if (!parsed) return;
    const cat = state.categories.find((c) => c.id === parsed.categoryId);
    const acct = scope.length === 1 ? primaryAccount(state, scope[0]) : undefined;
    if (parsed.amount && acct) {
      update((s) => ({ ...s, transactions: [...s.transactions, { id: uid(), createdAt: Date.now(), profileId: acct.profileId, type: parsed.isIncome ? 'income' : 'expense', amount: parsed.amount!, date: parsed.date, accountId: acct.id, categoryId: parsed.categoryId ?? (parsed.isIncome ? 'income-other' : 'other'), note: parsed.note || undefined }] }), {
        undo: `${parsed.isIncome ? 'Income' : 'Logged'} ${fmt(parsed.amount)}${cat ? ' · ' + cat.name : ''}`,
      });
      if (parsed.isIncome) celebrate();
      setQ('');
    } else {
      openModal('tx', { type: parsed.isIncome ? 'income' : 'expense', amount: parsed.amount, categoryId: parsed.categoryId, note: parsed.note, date: parsed.date });
      setQ('');
    }
  };

  if (noAccounts) {
    return (
      <>
        <div className="page-head reveal"><div className="titles"><h1 className="display">{greeting()}{who ? `, ${who.name}` : ''}</h1><p className="subline">Let's get {who ? 'your' : 'the'} money on the map.</p></div></div>
        <Empty icon={<Wallet />} title="Start with an account" text="Add a bank account or credit card with its starting balance. Then add your paydays and bills, and Budge will do the forecasting." action={<div className="actions"><button className="btn primary" onClick={() => openModal('account')}><Plus /> Add account</button></div>} />
      </>
    );
  }

  const status = sts.avgDaily === 0 ? null : sts.perDay >= sts.avgDaily ? { good: true, text: `You usually spend ${fmt0(sts.avgDaily)}/day — you're on pace` } : { good: false, text: `You usually spend ${fmt0(sts.avgDaily)}/day — that's more than this allows` };
  const lowTight = fc.low.balance < state.settings.buffer;

  return (
    <>
      <div className="page-head reveal">
        <div className="titles">
          <h1 className="display">{greeting()}{who ? `, ${who.name}` : ''}</h1>
          <p className="subline">{view === FAMILY ? 'Your household' : 'Your money'} · <b>{fmtDate(today, 'EEEE, MMM d')}</b></p>
        </div>
        <div className="actions hide-sm">
          <button className="btn" onClick={() => openModal('tx', { type: 'income' })}><Plus /> Income</button>
          <button className="btn primary" onClick={() => openModal('tx')}><Plus /> Expense</button>
        </div>
      </div>

      <div className="capture reveal" style={{ ['--d' as string]: '.05s' }}>
        <div className="capture-box">
          <Sparkles />
          <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') submitQuick(); }} placeholder="Quick log: “coffee 4.50”, “+250 bonus”" aria-label="Quick log" />
          {q ? <button className="icon-btn" onClick={submitQuick} aria-label="Add"><CornerDownLeft /></button> : <span className="kbd">⌘K</span>}
        </div>
        <div className="capture-hint">
          {parsed ? (
            <>
              <span className={`pill ${parsed.isIncome ? 'good' : 'info'}`}>{parsed.isIncome ? 'Income' : 'Expense'}</span>
              {parsed.amount ? <b className="num">{fmt(parsed.amount)}</b> : <span className="pill warn">add an amount</span>}
              {parsed.categoryId && <span className="pill mute"><Icon name={state.categories.find((c) => c.id === parsed.categoryId)?.icon ?? 'sparkles'} size={12} /> {state.categories.find((c) => c.id === parsed.categoryId)?.name}</span>}
              <span className="pill mute">{fmtDate(parsed.date, 'EEE, MMM d')}</span>
              {scope.length > 1 && <span className="muted">· pick who paid in the next step</span>}
            </>
          ) : <span className="muted">Type naturally — Budge guesses the category and date. Press Enter.</span>}
        </div>
      </div>

      {/* Hero */}
      <section className="hero reveal" style={{ ['--d' as string]: '.1s' }}>
        <div className="hero-main">
          <div className="eyebrow">Safe to spend {sts.payday ? 'until payday' : 'this month'}</div>
          <div className={`hero-num num${sts.safe < 0 ? ' bad' : ''}`}><CountUp value={sts.safe} format={fmt0} /></div>
          <p className="hero-sub">
            {sts.safe < 0
              ? (sts.liquid - sts.commitments >= 0
                ? <>You're <b>{fmt0(-sts.safe)}</b> short of your bank minimums — top up to avoid fees.</>
                : <>Bills due before {fmtDate(sts.untilDate, 'EEE, MMM d')} exceed your cash by <b>{fmt0(-sts.safe)}</b>.</>)
              : <>{sts.payday ? 'Until ' : 'Through '}<b>{fmtDate(sts.untilDate, 'EEE, MMM d')}</b> · {sts.days} day{sts.days === 1 ? '' : 's'} · about <b>{fmt0(sts.perDay)}/day</b></>}
          </p>
          <div className="hero-chips">
            <span className="hchip">Cash {fmt0(sts.liquid)}</span>
            <span className="hchip">Bills before then {fmt0(sts.commitments)}</span>
            {sts.reserved > 0 && <span className="hchip">Kept for bank minimums {fmt0(sts.reserved)}</span>}
          </div>
          {status && <p className={`hero-status ${status.good ? 'good' : 'bad'}`}>{status.text}</p>}
          <div className="hero-actions">
            <button className="btn hero-btn" onClick={() => navigate('/forecast')}><Wand2 /> Can I afford something?</button>
          </div>
        </div>
        <div className="hero-chart">
          <div className="hero-chart-head">
            <span className="eyebrow">Next 60 days</span>
            <span className={`hero-low${lowTight ? ' bad' : ''}`}>Lowest {fmt0(fc.low.balance)} · {fmtDate(fc.low.date)}</span>
          </div>
          <ForecastChart fc={fc} fmt={fmt0} currency={state.settings.currency} tone="hero" height={170} minimal />
        </div>
      </section>

      {insights.length > 0 && (
        <div className="insights reveal" style={{ ['--d' as string]: '.15s' }}>
          {insights.map((i) => (
            <button key={i.id} className={`insight ${i.tone}`} onClick={() => i.route && navigate(i.route)}>
              <span className="ins-icon"><Icon name={i.icon} size={18} /></span>
              <span className="ins-body"><b>{i.title}</b><span>{i.body}</span></span>
            </button>
          ))}
        </div>
      )}

      <div className="stats reveal" style={{ ['--d' as string]: '.2s' }}>
        <div className="stat"><span className="eyebrow">Cash</span><span className="v num"><CountUp value={t.liquid} format={fmt0} /></span><span className="d">across {inScope(state.accounts, scope).filter((a) => a.kind !== 'credit' && !a.archived).length} accounts</span></div>
        <div className="stat"><span className="eyebrow">Owed on cards</span><span className="v num"><CountUp value={t.cardDebt} format={fmt0} /></span><span className="d">{state.dues.filter((d) => d.status === 'open' && scope.includes(d.profileId) && d.accountId).length} payments scheduled</span></div>
        <div className="stat"><span className="eyebrow">Invested</span><span className="v num"><CountUp value={t.invested} format={fmt0} /></span><span className={`d ${t.invested - t.investedCost >= 0 ? 'pos' : 'neg'}`}>{t.investedCost ? `${t.invested - t.investedCost >= 0 ? '+' : '−'}${fmt0(Math.abs(t.invested - t.investedCost))} all-time` : 'Add an investment'}</span></div>
        <div className="stat"><span className="eyebrow">Net worth</span><span className="v num"><CountUp value={t.netWorth} format={fmt0} /></span><span className="d">cash + invested − cards</span></div>
      </div>

      {multi && (
        <div className="grid cols-2 reveal" style={{ ['--d' as string]: '.22s' }}>
          {state.profiles.map((p) => {
            const tt = totals(state, [p.id], bal);
            const over = budgetRows(state, [p.id], monthOf(today), today).filter((r) => r.state === 'over').length;
            return (
              <button key={p.id} className="card person-card" onClick={() => setView(p.id)} aria-label={`View ${p.name}'s finances`}>
                <div className="card-head"><span style={{ display: 'flex', alignItems: 'center', gap: 12 }}><Avatar profile={p} size="lg" /><span><b style={{ fontWeight: 500, fontSize: 18 }}>{p.name}</b><br /><span className="muted" style={{ fontSize: 13 }}>Net worth {fmt0(tt.netWorth)}</span></span></span>
                  {over > 0 && <span className="pill bad">{over} over budget</span>}</div>
                <div className="mini-stats"><div><span className="eyebrow">Cash</span><b className="num">{fmt0(tt.liquid)}</b></div><div><span className="eyebrow">Cards</span><b className="num">{fmt0(tt.cardDebt)}</b></div><div><span className="eyebrow">Invested</span><b className="num">{fmt0(tt.invested)}</b></div></div>
              </button>
            );
          })}
        </div>
      )}

      <div className="split">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>
          <section className="card flush reveal" style={{ ['--d' as string]: '.25s' }}>
            <div className="card-head" style={{ padding: '20px 22px 12px' }}>
              <h3>Budgets this month</h3>
              <button className="link-btn" onClick={() => navigate('/budgets')}>All budgets <ArrowRight /></button>
            </div>
            {budgets.length ? <div className="list">{budgets.slice(0, 5).map((r) => <BudgetLine key={r.categoryId} r={r} frac={frac} onClick={() => navigate('/budgets')} />)}</div> : (
              <div style={{ padding: '4px 22px 22px' }}><p className="help">No budgets yet. Set a monthly limit for groceries, dining or anything else and Budge will tell you when you're running hot.</p><br /><button className="btn small" onClick={() => openModal('budget')}><Plus /> Create a budget</button></div>
            )}
          </section>
          <section className="card flush reveal" style={{ ['--d' as string]: '.3s' }}>
            <div className="card-head" style={{ padding: '20px 22px 12px' }}>
              <h3>Recent activity</h3>
              <button className="link-btn" onClick={() => navigate('/activity')}>See all <ArrowRight /></button>
            </div>
            <div className="list">
              {recent.map((x) => <TxRow key={x.id} t={x} showDate showOwner={multi} />)}
              {!recent.length && <p className="help" style={{ padding: '0 22px 22px' }}>Nothing logged yet — try the quick log above.</p>}
            </div>
          </section>
        </div>
        <section className="card flush reveal" style={{ ['--d' as string]: '.28s' }}>
          <div className="card-head" style={{ padding: '20px 22px 12px' }}>
            <h3>Coming up</h3>
            <button className="link-btn" onClick={() => navigate('/bills')}>Schedule <ArrowRight /></button>
          </div>
          <div className="list">
            {upcoming.map((e, i) => <UpcomingRow key={i} e={e} showOwner={multi} />)}
            {!upcoming.length && <p className="help" style={{ padding: '0 22px 22px' }}>No bills or paydays scheduled. Add your income and recurring bills to see them here.</p>}
          </div>
        </section>
      </div>
    </>
  );
}
