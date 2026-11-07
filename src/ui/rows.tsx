import { ArrowLeftRight, ArrowRight, Repeat, Scale } from 'lucide-react';
import { fmtDate, relativeDay } from '../lib/dates';
import type { BudgetRow } from '../lib/ledger';
import type { ForecastEvent } from '../lib/forecast';
import { useApp } from '../lib/store';
import type { Transaction } from '../lib/types';
import { CatTile, Icon } from './Icon';
import { Owner } from './kit';

export function TxRow({ t, showDate, showOwner }: { t: Transaction; showDate?: boolean; showOwner?: boolean }) {
  const { state, today, fmt, openModal } = useApp();
  const cat = state.categories.find((c) => c.id === t.categoryId);
  const acct = state.accounts.find((a) => a.id === t.accountId);
  const to = state.accounts.find((a) => a.id === t.toAccountId);
  const holding = state.holdings.find((h) => h.id === t.toHoldingId);
  let title = t.note || cat?.name || 'Transaction';
  let sub: React.ReactNode = <>{cat && t.note ? cat.name + ' · ' : ''}{acct?.name}</>;
  let amt: React.ReactNode;
  let icon: React.ReactNode;
  switch (t.type) {
    case 'income': amt = <span className="pos">{fmt(t.amount, { sign: true })}</span>; icon = <CatTile cat={cat} />; break;
    case 'expense': amt = <span>−{fmt(t.amount)}</span>; icon = <CatTile cat={cat} />; break;
    case 'transfer':
      title = t.note || 'Transfer';
      sub = <>{acct?.name} <ArrowRight size={12} /> {to?.name ?? holding?.name ?? ''}</>;
      amt = <span className="muted">{fmt(t.amount)}</span>;
      icon = <span className="tile" style={{ ['--c' as string]: '#6B7B93' }}><ArrowLeftRight /></span>;
      break;
    default:
      title = 'Balance adjustment'; sub = acct?.name;
      amt = <span className={t.amount >= 0 ? 'pos' : ''}>{t.amount >= 0 ? '+' : '−'}{fmt(Math.abs(t.amount))}</span>;
      icon = <span className="tile" style={{ ['--c' as string]: '#8C8C99' }}><Scale /></span>;
  }
  return (
    <button type="button" className="li" onClick={() => openModal('tx', { id: t.id })}>
      {icon}
      <span className="body">
        <span className="t">{title}</span>
        <span className="s">{showOwner && <Owner id={t.profileId} />}{sub}{showDate && <> · {relativeDay(t.date, today)}</>}{(t.recurringId || t.dueId) && <Repeat size={12} aria-label="Scheduled" />}</span>
      </span>
      <span className="amt num">{amt}</span>
    </button>
  );
}

export function UpcomingRow({ e, showOwner }: { e: ForecastEvent; showOwner?: boolean }) {
  const { state, today, fmt, openModal } = useApp();
  const acct = state.accounts.find((a) => a.id === e.accountId);
  const income = e.amount > 0;
  const due = e.kind === 'due' ? state.dues.find((d) => d.id === e.refId) : undefined;
  const rec = e.refType === 'recurring' ? state.recurring.find((r) => r.id === e.refId) : undefined;
  const cat = state.categories.find((c) => c.id === (rec?.categoryId ?? due?.categoryId));
  const icon = income ? 'briefcase' : e.kind === 'due' ? (due?.accountId ? 'card' : 'landmark') : cat?.icon ?? 'repeat';
  const color = income ? 'var(--pos)' : e.kind === 'due' ? '#C65E3B' : cat?.color ?? '#6B7B93';
  const open = () => { if (e.refType === 'due') openModal('due', { id: e.refId }); else if (rec) openModal(rec.kind === 'income' ? 'income' : 'recurring', { id: rec.id }); };
  return (
    <button type="button" className="li" onClick={open}>
      <span className="tile" style={{ ['--c' as string]: color }}><Icon name={icon} /></span>
      <span className="body">
        <span className="t">{e.label}</span>
        <span className="s">{showOwner && <Owner id={e.profileId} />}{(() => { const rd = relativeDay(e.date, today); return rd.includes(fmtDate(e.date, 'MMM d')) ? rd : `${rd} · ${fmtDate(e.date, 'MMM d')}`; })()}{acct ? ` · ${acct.name}` : ''}</span>
      </span>
      <span className={`amt num ${income ? 'pos' : ''}`}>{income ? '+' : '−'}{fmt(Math.abs(e.amount))}</span>
    </button>
  );
}

export function BudgetLine({ r, frac, onClick }: { r: BudgetRow; frac?: number; onClick?: () => void }) {
  const { state, fmt0 } = useApp();
  const cat = state.categories.find((c) => c.id === r.categoryId);
  const color = r.state === 'over' ? 'var(--neg)' : r.state === 'watch' ? 'var(--warn)' : cat?.color ?? 'var(--accent)';
  return (
    <button type="button" className="li bl" onClick={onClick} disabled={!onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
      <CatTile cat={cat} />
      <span className="body" style={{ gap: 7 }}>
        <span style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'baseline' }}>
          <span className="t">{cat?.name}</span>
          <span className="num" style={{ fontSize: 13, color: 'var(--muted)', whiteSpace: 'nowrap' }}>{fmt0(r.spent)} <span style={{ opacity: .7 }}>of {fmt0(r.limit)}</span></span>
        </span>
        <span className="bar" style={{ ['--p' as string]: Math.min(100, r.pct * 100), ['--c' as string]: color, ['--m' as string]: frac !== undefined ? frac * 100 : 0 } as React.CSSProperties}>
          <i />{frac !== undefined && frac > 0 && frac < 1 && <b />}
        </span>
      </span>
      <span style={{ minWidth: 82, textAlign: 'right' }}>
        {r.state === 'over' ? <span className="pill bad">Over {fmt0(r.spent - r.limit)}</span>
          : r.state === 'watch' ? <span className="pill warn">{fmt0(r.remaining)} left</span>
          : <span className="pill good">{fmt0(r.remaining)} left</span>}
      </span>
    </button>
  );
}
