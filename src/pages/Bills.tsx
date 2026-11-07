import { useMemo, useState } from 'react';
import { BellRing, CalendarClock, Plus, Repeat } from 'lucide-react';
import { addDaysYMD, FREQUENCIES, fmtDate, ordinal } from '../lib/dates';
import { useForecast } from '../lib/hooks';
import { inScope, recOccurrences } from '../lib/ledger';
import { useApp } from '../lib/store';
import type { Recurring } from '../lib/types';
import { CatTile, Icon } from '../ui/Icon';
import { Empty, Owner, Seg } from '../ui/kit';
import { UpcomingRow } from '../ui/rows';
import { relativeDay } from '../lib/dates';

export function describeSchedule(r: Recurring): string {
  if (r.frequency === 'semimonthly') return `Twice a month · ${ordinal(r.days?.[0] ?? 7)} & ${ordinal(r.days?.[1] ?? 22)}${r.rollBack ? ' · day before weekends/holidays' : ''}`;
  return `${FREQUENCIES.find((f) => f.value === r.frequency)?.label ?? r.frequency}${r.rollBack ? ' · day before weekends/holidays' : ''}`;
}
const perMonth = (r: Recurring) => r.amount * ({ weekly: 52 / 12, biweekly: 26 / 12, semimonthly: 2, monthly: 1, quarterly: 1 / 3, yearly: 1 / 12 }[r.frequency]);

export function nextDate(r: Recurring, today: string): string | undefined {
  const from = r.postedThrough >= today ? addDaysYMD(r.postedThrough, 1) : addDaysYMD(today, 1);
  return recOccurrences(r, from, addDaysYMD(today, 800))[0];
}

type Tab = 'upcoming' | 'income' | 'recurring' | 'dues';

export default function Bills() {
  const { state, scope, today, fmt, fmt0, openModal } = useApp();
  const [tab, setTab] = useState<Tab>('upcoming');
  const fc = useForecast(60);
  const multi = scope.length > 1;
  const income = inScope(state.recurring, scope).filter((r) => r.kind === 'income');
  const bills = inScope(state.recurring, scope).filter((r) => r.kind === 'expense');
  const dues = inScope(state.dues, scope);
  const openDues = dues.filter((d) => d.status === 'open').sort((a, b) => a.date.localeCompare(b.date));
  const doneDues = dues.filter((d) => d.status !== 'open').sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);
  const incomeMonthly = income.filter((r) => r.active).reduce((s, r) => s + perMonth(r), 0);
  const billsMonthly = bills.filter((r) => r.active).reduce((s, r) => s + perMonth(r), 0);

  const groups = useMemo(() => {
    const m = new Map<string, typeof fc.events>();
    for (const e of fc.events) { const k = e.date; m.set(k, [...(m.get(k) ?? []), e]); }
    return [...m];
  }, [fc]);

  const addBtn = tab === 'income' ? <button className="btn primary" onClick={() => openModal('income')}><Plus /> Add income</button>
    : tab === 'dues' ? <button className="btn primary" onClick={() => openModal('due')}><Plus /> Add due</button>
    : <button className="btn primary" onClick={() => openModal('recurring')}><Plus /> Add bill</button>;

  const renderRec = (r: Recurring, i: number) => {
    const cat = state.categories.find((c) => c.id === r.categoryId);
    const acct = state.accounts.find((a) => a.id === r.accountId);
    const nd = nextDate(r, today);
    return (
      <button key={r.id} className="li reveal" style={{ ['--d' as string]: `${0.03 * i}s`, opacity: r.active ? 1 : 0.5 }} onClick={() => openModal(r.kind === 'income' ? 'income' : 'recurring', { id: r.id })}>
        {r.kind === 'income' ? <span className="tile" style={{ ['--c' as string]: 'var(--pos)' }}><Icon name="briefcase" /></span> : <CatTile cat={cat} />}
        <span className="body">
          <span className="t">{r.name}{!r.active && <span className="pill mute" style={{ marginLeft: 8 }}>Paused</span>}</span>
          <span className="s">{multi && <Owner id={r.profileId} />}{describeSchedule(r)}</span>
          <span className="s">{nd ? `Next ${fmtDate(nd, 'EEE, MMM d')}` : 'Ended'} · {acct?.name}</span>
        </span>
        <span className={`amt num ${r.kind === 'income' ? 'pos' : ''}`}>{r.kind === 'income' ? '+' : ''}{fmt(r.amount)}<small>≈ {fmt0(perMonth(r))}/mo</small></span>
      </button>
    );
  };

  return (
    <>
      <div className="page-head reveal">
        <div className="titles">
          <h1 className="display">Bills & income</h1>
          <p className="subline">Income <b className="pos">{fmt0(incomeMonthly)}</b>/mo · Recurring bills <b>{fmt0(billsMonthly)}</b>/mo</p>
        </div>
        <div className="actions">{addBtn}</div>
      </div>
      <div className="toolbar reveal" style={{ ['--d' as string]: '.04s' }}>
        <Seg<Tab> value={tab} onChange={setTab} label="Section" options={[{ value: 'upcoming', label: 'Upcoming' }, { value: 'income', label: 'Income' }, { value: 'recurring', label: 'Recurring' }, { value: 'dues', label: 'Card dues' }]} />
      </div>

      {tab === 'upcoming' && (groups.length ? (
        <section className="card flush reveal"><div className="list">
          {groups.map(([date, evs]) => (
            <div key={date}>
              <div className="li-group"><span>{(() => { const rd = relativeDay(date, today); return rd.includes(fmtDate(date, 'MMM d')) ? rd : `${rd} · ${fmtDate(date, 'MMM d')}`; })()}</span><span className="num">{fmt(evs.reduce((s, e) => s + e.amount, 0), { sign: true })}</span></div>
              {evs.map((e, i) => <UpcomingRow key={i} e={e} showOwner={multi} grouped />)}
            </div>
          ))}
        </div></section>
      ) : <Empty icon={<CalendarClock />} title="Nothing scheduled" text="Add your paydays and recurring bills and they'll line up here, day by day." action={<div className="actions"><button className="btn primary" onClick={() => openModal('income')}><Plus /> Add income</button><button className="btn" onClick={() => openModal('recurring')}><Plus /> Add bill</button></div>} />)}

      {tab === 'income' && (
        <>
          <div className="callout"><BellRing /> <span>Paydays are posted to your account automatically. If a pay date lands on a weekend or US holiday, it moves to the last business day before — so a Saturday 7th shows up on Friday the 6th.</span></div>
          {income.length ? <section className="card flush"><div className="list">{income.map(renderRec)}</div></section>
            : <Empty icon={<Icon name="briefcase" size={26} />} title="No income yet" text="Add your pay amount and pay days. Budge defaults to the 7th and 22nd of each month — change it any time." action={<button className="btn primary" onClick={() => openModal('income')}><Plus /> Add income</button>} />}
          <div className="actions"><button className="btn" onClick={() => openModal('tx', { type: 'income' })}><Plus /> Log a one-off (bonus, refund…)</button></div>
        </>
      )}

      {tab === 'recurring' && (bills.length ? <section className="card flush"><div className="list">{[...bills].sort((a, b) => (nextDate(a, today) ?? 'z').localeCompare(nextDate(b, today) ?? 'z')).map(renderRec)}</div></section>
        : <Empty icon={<Repeat />} title="No recurring bills" text="Rent, subscriptions, insurance, utilities — add them once and they post themselves every cycle." action={<button className="btn primary" onClick={() => openModal('recurring')}><Plus /> Add bill</button>} />)}

      {tab === 'dues' && (
        <>
          <div className="callout"><CalendarClock /> <span>Card dues are deducted from the bank account you choose on the due date, and applied to the card. Add the statement amount whenever you know it.</span></div>
          {openDues.length ? <section className="card flush"><div className="list">{openDues.map((d) => {
            const card = state.accounts.find((a) => a.id === d.accountId);
            const from = state.accounts.find((a) => a.id === d.payFromId);
            return (
              <button key={d.id} className="li" onClick={() => openModal('due', { id: d.id })}>
                <span className="tile" style={{ ['--c' as string]: '#C65E3B' }}><Icon name={card ? 'card' : 'landmark'} /></span>
                <span className="body"><span className="t">{d.name}</span><span className="s">{multi && <Owner id={d.profileId} />}{relativeDay(d.date, today)} · {fmtDate(d.date, 'MMM d')} · from {from?.name}</span></span>
                <span className="amt num">−{fmt(d.amount)}</span>
              </button>
            );
          })}</div></section> : <Empty icon={<CalendarClock />} title="No dues scheduled" text="Add a credit card payment (amount + due date) and we'll take it from your bank and show it in the forecast." action={<button className="btn primary" onClick={() => openModal('due')}><Plus /> Add due</button>} />}
          {doneDues.length > 0 && (
            <section className="stack"><div className="section-head"><h3>Recently handled</h3></div>
              <div className="card flush"><div className="list">{doneDues.map((d) => (
                <div key={d.id} className="li" style={{ opacity: .7 }}><span className="tile"><Icon name="card" /></span><span className="body"><span className="t">{d.name}</span><span className="s">{fmtDate(d.date, 'MMM d')} · {d.status === 'paid' ? 'Paid automatically' : 'Skipped'}</span></span><span className="amt num">{fmt(d.amount)}</span></div>
              ))}</div></div></section>
          )}
        </>
      )}
    </>
  );
}
