import { useMemo, useState } from 'react';
import { BellRing, CheckCircle2, Info, OctagonX, Plus, ShoppingBag, Trash2, TriangleAlert, Wand2 } from 'lucide-react';
import { addDaysYMD, fmtDate, relativeDay } from '../lib/dates';
import { checkAffordability, forecast, horizonFor, type Verdict } from '../lib/forecast';
import { useForecast } from '../lib/hooks';
import { uid } from '../lib/ledger';
import { useApp } from '../lib/store';
import { ForecastChart } from '../ui/charts';
import { CountUp, DateInput, Field, MoneyInput, Seg, num } from '../ui/kit';
import { navigate } from '../ui/router';

const VERDICT: Record<Verdict, { icon: React.ReactNode; title: string }> = {
  yes: { icon: <CheckCircle2 />, title: 'Yes — you can afford it' },
  tight: { icon: <TriangleAlert />, title: 'Tight — doable, but thin' },
  no: { icon: <OctagonX />, title: 'Not yet — you’d run short' },
};

export default function Forecast() {
  const { state, scope, today, view, bal, fmt0, update, toast } = useApp();
  const buffer = state.settings.buffer;
  const [horizon, setHorizon] = useState(90);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(addDaysYMD(today, 7));
  const amt = num(amount);
  const len = Math.max(horizon, amt > 0 ? horizonFor(date, today, horizon) : horizon);
  const fc = useForecast(len);
  const a = amt > 0 ? checkAffordability(fc, amt, date < today ? today : date, buffer) : null;
  const planned = state.planned.filter((p) => p.scope === view);

  const rowsFor = useMemo(() => planned.map((p) => {
    const f = forecast(state, scope, horizonFor(p.date, today), today, bal);
    return { p, a: checkAffordability(f, p.amount, p.date < today ? today : p.date, buffer) };
  }), [planned, state, scope, today, bal, buffer]);

  const incomeCount = fc.events.filter((e) => e.kind === 'income').length;
  const noIncome = incomeCount === 0;

  return (
    <>
      <div className="page-head reveal">
        <div className="titles">
          <h1 className="display">Forecast</h1>
          <p className="subline">Where your cash is headed — from paydays, bills, card dues and your typical spending</p>
        </div>
        <Seg<number> value={horizon} onChange={setHorizon} label="Horizon" options={[{ value: 30, label: '30d' }, { value: 60, label: '60d' }, { value: 90, label: '90d' }, { value: 180, label: '6mo' }]} />
      </div>

      {noIncome && <div className="callout warn reveal"><BellRing /><span>No paydays scheduled for this view, so the forecast only shows money going out. <button className="link-btn" onClick={() => navigate('/bills')}>Add income →</button></span></div>}
      {fc.accountLows.slice(0, 2).map((l) => (
        <div key={l.accountId} className="callout bad reveal"><OctagonX /><span><b>{l.name}</b> would dip to <b>{fmt0(l.balance)}</b> on {fmtDate(l.date, 'EEE, MMM d')}. Move money in beforehand or change which account a due comes from.</span></div>
      ))}

      <div className="stats reveal" style={{ ['--d' as string]: '.05s' }}>
        <div className="stat"><span className="eyebrow">Cash today</span><span className="v num"><CountUp value={fc.start} format={fmt0} /></span></div>
        <div className="stat"><span className="eyebrow">Lowest point</span><span className={`v num ${fc.low.balance < 0 ? 'neg' : fc.low.balance < buffer ? 'warn' : ''}`}><CountUp value={fc.low.balance} format={fmt0} /></span><span className="d">{fmtDate(fc.low.date, 'EEE, MMM d')}</span></div>
        <div className="stat"><span className="eyebrow">In {len} days</span><span className="v num"><CountUp value={fc.end} format={fmt0} /></span><span className={`d ${fc.end - fc.start >= 0 ? 'pos' : 'neg'}`}>{fc.end - fc.start >= 0 ? '+' : '−'}{fmt0(Math.abs(fc.end - fc.start))}</span></div>
        <div className="stat"><span className="eyebrow">Typical spend</span><span className="v num">{fmt0(fc.avgDaily)}<span className="muted" style={{ fontSize: 16 }}>/day</span></span><button className="link-btn" style={{ fontSize: 12 }} onClick={() => navigate('/settings')}>last {state.settings.windowDays} days · adjust</button></div>
      </div>

      <section className="card reveal" style={{ ['--d' as string]: '.1s' }}>
        <div className="card-head">
          <h3>Projected cash</h3>
          <div className="legend"><span><i className="in" />Paycheck</span><span><i className="out" />Bill / due</span><span><i className="low" />Low point</span>{a && <span><i className="wi" />With purchase</span>}</div>
        </div>
        <ForecastChart fc={fc} fmt={fmt0} currency={state.settings.currency} buffer={buffer} whatIf={a && amt > 0 ? { amount: amt, date: date < today ? today : date } : undefined} height={300} />
        <p className="help">Drag across the chart to see any day. Dotted line is your {fmt0(buffer)} cushion.</p>
      </section>

      <div className="split">
        <section className="card afford reveal" style={{ ['--d' as string]: '.14s' }}>
          <div className="card-head"><div><h3>Can I afford it?</h3><span className="sub">Try a future expense against the forecast</span></div><Wand2 size={20} className="muted" /></div>
          <div className="row">
            <Field label="What is it?"><input value={name} placeholder="e.g. New laptop, flights" onChange={(e) => setName(e.target.value)} /></Field>
            <Field label="When would you pay?"><DateInput value={date} min={today} onChange={setDate} /></Field>
          </div>
          <MoneyInput label="Cost" value={amount} onChange={setAmount} placeholder="0" />
          {a ? (
            <div className={`verdict ${a.verdict}`} aria-live="polite">
              <div className="v-head">{VERDICT[a.verdict].icon}<b>{VERDICT[a.verdict].title}</b></div>
              <ul>
                <li>Lowest your cash gets after buying: <b className="num">{fmt0(a.lowAfter)}</b> on {fmtDate(a.lowDate, 'EEE, MMM d')}.</li>
                <li>{a.slack >= 0 ? <>You'd still hold <b>{fmt0(a.slack)}</b> above your {fmt0(buffer)} cushion.</> : a.lowAfter >= 0 ? <>That's <b>{fmt0(-a.slack)}</b> into your {fmt0(buffer)} cushion.</> : <>That's <b>{fmt0(-a.lowAfter)}</b> below zero.</>}</li>
                {a.verdict !== 'yes' && <li>{a.earliest ? <>Earliest comfortable date: <b>{fmtDate(a.earliest, 'EEE, MMM d')}</b> ({relativeDay(a.earliest, today).toLowerCase()}).</> : <>No comfortable date in the next {len} days at your current pace.</>}</li>}
                <li>On {fmtDate(date, 'MMM d')} you could spend up to <b>{fmt0(a.maxAmount)}</b> and keep your cushion.</li>
              </ul>
              <div className="actions">
                <button className="btn small" disabled={!name.trim()} onClick={() => { update((s) => ({ ...s, planned: [...s.planned, { id: uid(), scope: view, name: name.trim(), amount: amt, date }] })); toast(`${name.trim()} saved to your plan`); setName(''); setAmount(''); }}><Plus /> Save to plan</button>
                {a.earliest && a.verdict !== 'yes' && <button className="btn small" onClick={() => setDate(a.earliest!)}>Try {fmtDate(a.earliest, 'MMM d')}</button>}
              </div>
              {!name.trim() && <span className="help">Add a name to save it.</span>}
            </div>
          ) : <div className="callout"><Info /><span>Enter a cost and date. We'll replay your forecast with that purchase and tell you whether you stay above your cushion.</span></div>}
        </section>

        <section className="card flush reveal" style={{ ['--d' as string]: '.18s' }}>
          <div className="card-head" style={{ padding: '20px 22px 12px' }}><h3>Planned purchases</h3></div>
          {rowsFor.length ? (
            <div className="list">{rowsFor.map(({ p, a: pa }) => (
              <div key={p.id} className="li">
                <button className="tile" style={{ ['--c' as string]: pa.verdict === 'yes' ? 'var(--pos)' : pa.verdict === 'tight' ? 'var(--warn)' : 'var(--neg)', border: 0, cursor: 'pointer' }} aria-label={`Test ${p.name}`} onClick={() => { setName(p.name); setAmount(String(p.amount)); setDate(p.date < today ? today : p.date); window.scrollTo({ top: 0, behavior: 'smooth' }); }}><ShoppingBag /></button>
                <span className="body"><span className="t">{p.name}</span><span className="s">{fmt0(p.amount)} · {fmtDate(p.date, 'MMM d')}</span>
                  <span className="s">{pa.verdict === 'yes' ? <span className="pill good">Affordable</span> : pa.verdict === 'tight' ? <span className="pill warn">Tight</span> : <span className="pill bad">Not yet</span>}{pa.verdict !== 'yes' && pa.earliest && <span>try {fmtDate(pa.earliest, 'MMM d')}</span>}</span></span>
                <button className="icon-btn" aria-label={`Remove ${p.name}`} onClick={() => update((s) => ({ ...s, planned: s.planned.filter((x) => x.id !== p.id) }), { undo: `${p.name} removed` })}><Trash2 /></button>
              </div>
            ))}</div>
          ) : <p className="help" style={{ padding: '0 22px 22px' }}>Check a purchase on the left and save it here — Budge keeps re-checking it as your money changes.</p>}
          {rowsFor.length > 0 && <p className="help" style={{ padding: '4px 22px 18px' }}>Each one is checked on its own, not stacked together.</p>}
        </section>
      </div>

      <section className="card reveal">
        <div className="card-head"><h3>How this is calculated</h3></div>
        <ul className="assume">
          <li><b>Starts with</b> your cash today ({state.settings.includeSavings ? 'checking, savings and cash' : 'checking and cash'}).</li>
          <li><b>Adds</b> every scheduled paycheck, using each pay date (weekend/holiday paydays move to the day before).</li>
          <li><b>Subtracts</b> recurring bills and card dues on their dates from the account they come out of.</li>
          <li><b>Subtracts</b> your typical everyday spending — {fmt0(fc.avgDaily)}/day, averaged over the last {state.settings.windowDays} days (bills and card payments excluded).</li>
          <li><b>Cushion:</b> {fmt0(buffer)} is treated as untouchable — verdicts of “tight” mean you'd dip into it.</li>
        </ul>
      </section>
    </>
  );
}
