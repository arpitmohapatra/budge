import { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarClock, CornerDownLeft, Gauge, Landmark, LayoutGrid, LineChart, ListChecks, Moon, PiggyBank, Plus, Search, Settings as Cog, Sparkles, TrendingUp, Users, Wallet } from 'lucide-react';
import { parseQuick } from '../lib/quickparse';
import { useApp } from '../lib/store';
import { FAMILY } from '../lib/types';
import { navigate } from './router';

interface Item { id: string; label: string; hint?: string; icon: React.ReactNode; run: () => void; group: string; }

export function Palette() {
  const { palette, setPalette, state, today, openModal, setView, update, fmt } = useApp();
  const ref = useRef<HTMLDialogElement>(null);
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (palette && !d.open) { setQ(''); setSel(0); d.showModal(); }
    if (!palette && d.open) d.close();
  }, [palette]);

  const items = useMemo<Item[]>(() => {
    const go = (to: string) => () => { setPalette(false); navigate(to); };
    const act = (name: string, props?: Record<string, unknown>) => () => { setPalette(false); openModal(name, props); };
    const list: Item[] = [
      { id: 'a-exp', group: 'Add', label: 'Add expense', icon: <Plus />, run: act('tx') },
      { id: 'a-inc', group: 'Add', label: 'Log income', icon: <Plus />, run: act('tx', { type: 'income' }) },
      { id: 'a-cash', group: 'Add', label: 'Log cash withdrawal', icon: <Wallet />, run: act('tx', { categoryId: 'cash', note: 'Cash withdrawal' }) },
      { id: 'a-acc', group: 'Add', label: 'Add account or card', icon: <Landmark />, run: act('account') },
      { id: 'a-due', group: 'Add', label: 'Add card due', icon: <CalendarClock />, run: act('due') },
      { id: 'a-pay', group: 'Add', label: 'Add paycheck schedule', icon: <Plus />, run: act('income') },
      { id: 'a-bill', group: 'Add', label: 'Add recurring bill', icon: <Plus />, run: act('recurring') },
      { id: 'a-bud', group: 'Add', label: 'Create budget', icon: <PiggyBank />, run: act('budget') },
      { id: 'a-inv', group: 'Add', label: 'Add investment', icon: <TrendingUp />, run: act('holding') },
      { id: 'g-home', group: 'Go to', label: 'Home', icon: <LayoutGrid />, run: go('/') },
      { id: 'g-act', group: 'Go to', label: 'Activity', icon: <ListChecks />, run: go('/activity') },
      { id: 'g-bud', group: 'Go to', label: 'Budgets', icon: <Gauge />, run: go('/budgets') },
      { id: 'g-fc', group: 'Go to', label: 'Forecast & “Can I afford it?”', icon: <LineChart />, run: go('/forecast') },
      { id: 'g-acc', group: 'Go to', label: 'Accounts & cards', icon: <Landmark />, run: go('/accounts') },
      { id: 'g-bill', group: 'Go to', label: 'Bills & income', icon: <CalendarClock />, run: go('/bills') },
      { id: 'g-inv', group: 'Go to', label: 'Investments', icon: <TrendingUp />, run: go('/invest') },
      { id: 'g-set', group: 'Go to', label: 'Settings & backup', icon: <Cog />, run: go('/settings') },
      { id: 'v-fam', group: 'View', label: 'Switch to Family view', icon: <Users />, run: () => { setView(FAMILY); setPalette(false); } },
      ...state.profiles.map((p) => ({ id: `v-${p.id}`, group: 'View', label: `Switch to ${p.name}`, icon: <Users />, run: () => { setView(p.id); setPalette(false); } })),
      { id: 'th', group: 'View', label: 'Toggle dark mode', icon: <Moon />, run: () => { update((s) => ({ ...s, settings: { ...s.settings, theme: document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark' } })); setPalette(false); } },
    ];
    const needle = q.trim().toLowerCase();
    const parsed = needle ? parseQuick(q, state, today) : null;
    const out: Item[] = [];
    if (parsed?.amount) {
      const c = state.categories.find((x) => x.id === parsed.categoryId);
      out.push({ id: 'quick', group: 'Quick log', label: `${parsed.isIncome ? 'Income' : 'Expense'} ${fmt(parsed.amount)}${parsed.note ? ` · ${parsed.note}` : ''}`, hint: `${c?.name ?? 'Other'} · ${parsed.date}`, icon: <Sparkles />, run: act('tx', { type: parsed.isIncome ? 'income' : 'expense', amount: parsed.amount, categoryId: parsed.categoryId, note: parsed.note, date: parsed.date }) });
    }
    return [...out, ...list.filter((i) => !needle || i.label.toLowerCase().includes(needle) || i.group.toLowerCase().includes(needle))];
  }, [q, state, today, setPalette, openModal, setView, update, fmt]);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => Math.min(items.length - 1, s + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => Math.max(0, s - 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); items[sel]?.run(); }
  };
  useEffect(() => setSel(0), [q]);

  let last = '';
  return (
    <dialog ref={ref} className="palette" aria-label="Command palette" onClose={() => setPalette(false)} onClick={(e) => { if (e.target === ref.current) setPalette(false); }}>
      <div className="pal-input"><Search /><input autoFocus={palette} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKey} placeholder="Jump to…  or log: “groceries 84.20 yesterday”" aria-label="Search commands" /><span className="kbd">esc</span></div>
      <div className="pal-list" role="listbox">
        {items.map((it, i) => {
          const head = it.group !== last ? <div className="eyebrow pal-group" key={`g-${it.group}`}>{it.group}</div> : null;
          last = it.group;
          return (
            <div key={it.id}>
              {head}
              <button className="pal-item" role="option" aria-selected={i === sel} onMouseEnter={() => setSel(i)} onClick={it.run}>{it.icon}{it.label}{it.hint ? <small>{it.hint}</small> : i === sel ? <small><CornerDownLeft size={14} /></small> : null}</button>
            </div>
          );
        })}
        {!items.length && <p className="help" style={{ padding: 16 }}>No matches.</p>}
      </div>
    </dialog>
  );
}
