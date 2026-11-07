import { useMemo } from 'react';
import { ArrowRightLeft, CalendarPlus, Landmark, Pencil, Plus, Scale } from 'lucide-react';
import { fmtDate, relativeDay } from '../lib/dates';
import { inScope, totals } from '../lib/ledger';
import { useApp } from '../lib/store';
import type { Account } from '../lib/types';
import { Icon, kindMeta } from '../ui/Icon';
import { CountUp, Empty, Owner } from '../ui/kit';

function AccountCard({ a, i }: { a: Account; i: number }) {
  const { state, bal, today, scope, fmt, fmt0, openModal } = useApp();
  const meta = kindMeta(a.kind);
  const b = bal[a.id] ?? 0;
  const isCard = a.kind === 'credit';
  const owed = -b;
  const dues = state.dues.filter((d) => d.accountId === a.id && d.status === 'open').sort((x, y) => x.date.localeCompare(y.date));
  const util = isCard && a.limit ? Math.max(0, owed) / a.limit : 0;
  const payFrom = (id: string) => state.accounts.find((x) => x.id === id)?.name;
  return (
    <div className="card acct reveal" style={{ ['--d' as string]: `${0.04 * i}s`, ['--c' as string]: meta.color }}>
      <div className="card-head">
        <span style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <span className="tile" style={{ ['--c' as string]: meta.color }}><Icon name={meta.icon} /></span>
          <span style={{ minWidth: 0 }}>
            <b style={{ fontWeight: 500, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</b>
            <span className="muted" style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>{scope.length > 1 && <Owner id={a.profileId} />}{meta.label}{a.last4 ? ` ··${a.last4}` : ''}{a.primary && <span className="pill info" style={{ padding: '0 8px' }}>Main</span>}</span>
          </span>
        </span>
        <button className="icon-btn" aria-label={`Edit ${a.name}`} onClick={() => openModal('account', { id: a.id })}><Pencil /></button>
      </div>
      <div>
        <div className="eyebrow">{isCard ? 'You owe' : 'Balance'}</div>
        <div className={`acct-bal num ${!isCard && b < 0 ? 'neg' : ''}`}><CountUp value={isCard ? owed : b} format={fmt} /></div>
      </div>
      {!isCard && a.minBalance ? (() => {
        const scale = Math.max(b, a.minBalance) * 1.2 || 1;
        const under = b < a.minBalance;
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div className="bar" style={{ ['--p' as string]: Math.max(0, b) / scale * 100, ['--c' as string]: under ? 'var(--neg)' : 'var(--pos)', ['--m' as string]: a.minBalance / scale * 100 } as React.CSSProperties}><i /><b /></div>
            <span className={under ? 'neg' : 'muted'} style={{ fontSize: 12 }}>
              {under
                ? <>{fmt0(a.minBalance - b)} under the {fmt0(a.minBalance)} minimum{a.minFee ? ` — ${fmt0(a.minFee)} fee risk` : ' — fee risk'}</>
                : <>{fmt0(b - a.minBalance)} above the {fmt0(a.minBalance)} minimum{a.minFee ? ` (avoids a ${fmt0(a.minFee)} fee)` : ''}</>}
            </span>
          </div>
        );
      })() : null}
      {isCard && a.limit ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div className="bar" style={{ ['--p' as string]: util * 100, ['--c' as string]: util > 0.5 ? 'var(--neg)' : util > 0.3 ? 'var(--warn)' : 'var(--pos)' } as React.CSSProperties}><i /></div>
          <span className="muted" style={{ fontSize: 12 }}>{Math.round(util * 100)}% of {fmt0(a.limit)} limit used · {fmt0(Math.max(0, a.limit - owed))} available</span>
        </div>
      ) : null}
      {isCard && (
        <div className="dues">
          <div className="eyebrow">Upcoming payments</div>
          {dues.length ? dues.map((d) => (
            <button key={d.id} className="due-row" onClick={() => openModal('due', { id: d.id })}>
              <span className="due-date"><b>{fmtDate(d.date, 'd')}</b><small>{fmtDate(d.date, 'MMM')}</small></span>
              <span className="body"><span className="t">{fmt(d.amount)}</span><span className="s">{relativeDay(d.date, today)} · from {payFrom(d.payFromId)}</span></span>
              <Pencil size={14} className="muted" />
            </button>
          )) : <p className="help">No payment scheduled. Add the amount due and when — we'll deduct it from your bank automatically.</p>}
        </div>
      )}
      <div className="acct-actions">
        {isCard ? <button className="btn small" onClick={() => openModal('due', { accountId: a.id })}><CalendarPlus /> Add due</button> : null}
        {isCard ? <button className="btn small" onClick={() => openModal('tx', { type: 'transfer', accountId: state.accounts.find((x) => x.profileId === a.profileId && x.primary)?.id })}><ArrowRightLeft /> Pay now</button> : null}
        <button className="btn small" onClick={() => openModal('adjust', { accountId: a.id })}><Scale /> Update balance</button>
      </div>
    </div>
  );
}

export default function Accounts() {
  const { state, scope, bal, fmt0, openModal } = useApp();
  const mine = inScope(state.accounts, scope).filter((a) => !a.archived);
  const cash = mine.filter((a) => a.kind !== 'credit');
  const cards = mine.filter((a) => a.kind === 'credit');
  const t = useMemo(() => totals(state, scope, bal), [state, scope, bal]);
  const dueTotal = state.dues.filter((d) => d.status === 'open' && scope.includes(d.profileId)).reduce((s, d) => s + d.amount, 0);
  return (
    <>
      <div className="page-head reveal">
        <div className="titles">
          <h1 className="display">Accounts</h1>
          <p className="subline">Cash <b>{fmt0(t.liquid)}</b> · Cards owed <b>{fmt0(t.cardDebt)}</b> · Dues scheduled <b>{fmt0(dueTotal)}</b></p>
        </div>
        <div className="actions"><button className="btn primary" onClick={() => openModal('account')}><Plus /> Add account</button></div>
      </div>
      {!mine.length && <Empty icon={<Landmark />} title="No accounts yet" text="Add your bank accounts and credit cards with their balances today. Everything else builds on this." action={<button className="btn primary" onClick={() => openModal('account')}><Plus /> Add account</button>} />}
      {cash.length > 0 && (
        <section className="stack">
          <div className="section-head"><h3>Bank & cash</h3></div>
          <div className="grid auto">{cash.map((a, i) => <AccountCard key={a.id} a={a} i={i} />)}
            <button className="card add" onClick={() => openModal('account', { kind: 'checking' })}><Plus /> Add bank account</button></div>
        </section>
      )}
      {(cards.length > 0 || cash.length > 0) && (
        <section className="stack">
          <div className="section-head"><h3>Credit cards</h3></div>
          <div className="grid auto">{cards.map((a, i) => <AccountCard key={a.id} a={a} i={i} />)}
            <button className="card add" onClick={() => openModal('account', { kind: 'credit' })}><Plus /> Add credit card</button></div>
        </section>
      )}
    </>
  );
}
