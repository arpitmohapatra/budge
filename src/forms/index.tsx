import { CalendarClock, Landmark, LineChart, Settings as Cog } from 'lucide-react';
import { useApp } from '../lib/store';
import { Sheet } from '../ui/kit';
import { navigate } from '../ui/router';
import { AccountForm, AdjustForm, DueForm } from './AccountForms';
import { HoldingForm, HoldingMoneyForm } from './InvestForms';
import { BudgetForm, RecurringForm } from './PlanForms';
import TxForm from './TxForm';

function MoreSheet() {
  const { closeModal } = useApp();
  const items = [
    { to: '/accounts', icon: <Landmark />, label: 'Accounts & cards', sub: 'Balances, credit cards, dues' },
    { to: '/bills', icon: <CalendarClock />, label: 'Bills & income', sub: 'Paydays, subscriptions, rent' },
    { to: '/invest', icon: <LineChart />, label: 'Investments', sub: 'Holdings and growth' },
    { to: '/settings', icon: <Cog />, label: 'Settings & backup', sub: 'Profiles, theme, export' },
  ];
  return (
    <Sheet title="More" onClose={closeModal}>
      <div className="list" style={{ margin: '0 -18px' }}>
        {items.map((i) => (
          <button key={i.to} className="li" onClick={() => { closeModal(); navigate(i.to); }}>
            <span className="tile">{i.icon}</span>
            <span className="body"><span className="t">{i.label}</span><span className="s">{i.sub}</span></span>
          </button>
        ))}
      </div>
    </Sheet>
  );
}

export function ModalHost() {
  const { modal } = useApp();
  if (!modal) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = (modal.props ?? {}) as any;
  switch (modal.name) {
    case 'tx': return <TxForm key={JSON.stringify(modal.props)} id={p.id} preset={p} />;
    case 'account': return <AccountForm {...p} />;
    case 'due': return <DueForm {...p} />;
    case 'adjust': return <AdjustForm {...p} />;
    case 'income': return <RecurringForm kind="income" {...p} />;
    case 'recurring': return <RecurringForm kind="expense" {...p} />;
    case 'budget': return <BudgetForm {...p} />;
    case 'holding': return <HoldingForm {...p} />;
    case 'holding-money': return <HoldingMoneyForm {...p} />;
    case 'more': return <MoreSheet />;
    default: return null;
  }
}
