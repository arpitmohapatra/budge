import { useState } from 'react';
import { Check, Trash2 } from 'lucide-react';
import { HOLDING_KINDS, Icon } from '../ui/Icon';
import { Field, MoneyInput, Sheet, num } from '../ui/kit';
import { useApp } from '../lib/store';
import { round2, uid } from '../lib/ledger';
import { FAMILY, type Holding, type HoldingKind, type Snapshot } from '../lib/types';
import { AccountSelect } from './TxForm';

const withSnapshot = (h: Holding, s: Snapshot): Holding => ({ ...h, snapshots: [...h.snapshots.filter((x) => x.date !== s.date), s].sort((a, b) => a.date.localeCompare(b.date)) });

export function HoldingForm({ id }: { id?: string }) {
  const { state, today, view, update, closeModal } = useApp();
  const ex = id ? state.holdings.find((h) => h.id === id) : undefined;
  const [owner, setOwner] = useState(ex?.profileId ?? (view !== FAMILY ? view : state.profiles[0].id));
  const [name, setName] = useState(ex?.name ?? '');
  const [kind, setKind] = useState<HoldingKind>(ex?.kind ?? 'retirement');
  const [invested, setInvested] = useState(ex ? String(ex.invested) : '');
  const [value, setValue] = useState(ex ? String(ex.value) : '');
  const save = () => {
    if (!name.trim()) return;
    if (ex) {
      update((s) => ({ ...s, holdings: s.holdings.map((h) => (h.id === ex.id ? { ...h, name: name.trim(), kind } : h)) }), { toast: 'Saved' });
    } else {
      const inv = num(invested), val = value === '' ? inv : num(value);
      const h: Holding = { id: uid(), profileId: owner, name: name.trim(), kind, invested: inv, value: val, snapshots: [{ date: today, value: val, invested: inv }], createdAt: Date.now() };
      update((s) => ({ ...s, holdings: [...s.holdings, h] }), { toast: `${h.name} added` });
    }
    closeModal();
  };
  return (
    <Sheet title={ex ? 'Edit investment' : 'Add investment'} onClose={closeModal}>
      {!ex && state.profiles.length > 1 && (
        <Field label="Whose investment?"><select value={owner} onChange={(e) => setOwner(e.target.value)}>{state.profiles.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
      )}
      <Field label="Name"><input data-af="1" value={name} placeholder="e.g. Fidelity 401(k), VTI, Roth IRA" onChange={(e) => setName(e.target.value)} /></Field>
      <div className="kind-grid">
        {HOLDING_KINDS.map((k) => (
          <button key={k.value} type="button" className="kind-opt" aria-pressed={kind === k.value} onClick={() => setKind(k.value)}>
            <span className="tile sm" style={{ ['--c' as string]: k.color }}><Icon name={k.icon} /></span>{k.label}
          </button>
        ))}
      </div>
      {!ex && (
        <div className="row keep">
          <MoneyInput label="Total you've put in" value={invested} onChange={setInvested} hint="Cost basis" />
          <MoneyInput label="Worth today" value={value} onChange={setValue} hint="Leave blank if same" />
        </div>
      )}
      <div className="dlg-foot">
        {ex && <button type="button" className="btn danger" onClick={() => { if (confirm(`Delete ${ex.name}?`)) { update((s) => ({ ...s, holdings: s.holdings.filter((h) => h.id !== ex.id) }), { undo: `${ex.name} deleted` }); closeModal(); } }}><Trash2 /> Delete</button>}
        <span className="spacer" />
        <button type="button" className="btn primary" disabled={!name.trim()} onClick={save}><Check /> {ex ? 'Save' : 'Add'}</button>
      </div>
    </Sheet>
  );
}

export function HoldingMoneyForm({ id, mode }: { id: string; mode: 'add' | 'value' }) {
  const { state, today, update, closeModal, fmt } = useApp();
  const h = state.holdings.find((x) => x.id === id)!;
  const banks = state.accounts.filter((a) => a.profileId === h.profileId && !a.archived && a.kind !== 'credit');
  const [v, setV] = useState(mode === 'value' ? String(h.value) : '');
  const [from, setFrom] = useState('');
  const amt = num(v);
  const save = () => {
    if (mode === 'add') {
      if (amt <= 0) return;
      update((s) => {
        const nh = withSnapshot({ ...h, invested: round2(h.invested + amt), value: round2(h.value + amt) }, { date: today, value: round2(h.value + amt), invested: round2(h.invested + amt) });
        return {
          ...s, holdings: s.holdings.map((x) => (x.id === h.id ? nh : x)),
          transactions: from ? [...s.transactions, { id: uid(), createdAt: Date.now(), profileId: h.profileId, type: 'transfer', amount: amt, date: today, accountId: from, toHoldingId: h.id, note: `Invest in ${h.name}` }] : s.transactions,
        };
      }, { toast: `Added ${fmt(amt)} to ${h.name}` });
    } else {
      update((s) => ({ ...s, holdings: s.holdings.map((x) => (x.id === h.id ? withSnapshot({ ...x, value: amt }, { date: today, value: amt, invested: x.invested }) : x)) }), { toast: `${h.name} updated` });
    }
    closeModal();
  };
  return (
    <Sheet title={mode === 'add' ? `Add money to ${h.name}` : `Update ${h.name}`} onClose={closeModal}>
      <MoneyInput label={mode === 'add' ? 'Amount contributed' : 'Current value'} value={v} onChange={setV} autoFocus hint={mode === 'value' ? `Was ${fmt(h.value)}. Check your brokerage app and type today's value.` : undefined} />
      {mode === 'add' && (
        <Field label="Take it from (optional)" hint="Pick an account to deduct this from its balance.">
          <AccountSelect value={from} onChange={setFrom} accounts={banks} allowNone noneLabel="Don't deduct from an account" />
        </Field>
      )}
      <div className="dlg-foot"><span className="spacer" />
        <button type="button" className="btn primary" disabled={mode === 'add' ? amt <= 0 : v === ''} onClick={save}><Check /> Save</button>
      </div>
    </Sheet>
  );
}
