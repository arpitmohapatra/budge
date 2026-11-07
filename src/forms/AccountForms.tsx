import { useState } from 'react';
import { Check, Trash2 } from 'lucide-react';
import { ACCOUNT_KINDS, Icon } from '../ui/Icon';
import { DateInput, Field, MoneyInput, Sheet, Toggle, num } from '../ui/kit';
import { deleteAccount, useApp } from '../lib/store';
import { FAMILY, type Account, type AccountKind, type Due } from '../lib/types';
import { round2, uid } from '../lib/ledger';
import { AccountSelect } from './TxForm';

/* ───────── Account ───────── */
export function AccountForm({ id, profileId, kind: presetKind }: { id?: string; profileId?: string; kind?: AccountKind }) {
  const { state, today, view, update, closeModal, bal } = useApp();
  const ex = id ? state.accounts.find((a) => a.id === id) : undefined;
  const [kind, setKind] = useState<AccountKind>(ex?.kind ?? presetKind ?? 'checking');
  const [owner, setOwner] = useState(ex?.profileId ?? profileId ?? (view !== FAMILY ? view : state.profiles[0].id));
  const [name, setName] = useState(ex?.name ?? '');
  const [start, setStart] = useState(ex ? String(Math.abs(bal[ex.id] ?? ex.startingBalance)) : '');
  const [neg, setNeg] = useState(ex ? (bal[ex.id] ?? 0) < 0 && ex.kind !== 'credit' : false);
  const [limit, setLimit] = useState(ex?.limit ? String(ex.limit) : '');
  const [last4, setLast4] = useState(ex?.last4 ?? '');
  const [minBal, setMinBal] = useState(ex?.minBalance ? String(ex.minBalance) : '');
  const [minFee, setMinFee] = useState(ex?.minFee ? String(ex.minFee) : '');
  const [primary, setPrimary] = useState(ex?.primary ?? !state.accounts.some((a) => a.profileId === owner && a.primary));
  const isCard = kind === 'credit';
  const placeholder = { checking: 'e.g. Chase Checking', savings: 'e.g. Ally Savings', credit: 'e.g. Sapphire Visa', cash: 'Wallet' }[kind];

  const save = () => {
    if (!name.trim()) return;
    const entered = num(start);
    if (ex) {
      // Editing: if they typed a different balance, record the gap as an adjustment instead of rewriting history.
      const cur = bal[ex.id] ?? 0;
      const want = isCard ? -entered : neg ? -entered : entered;
      const diff = round2(want - cur);
      update((s) => ({
        ...s,
        accounts: s.accounts.map((a) => (a.id === ex.id ? { ...a, name: name.trim(), kind, limit: isCard ? num(limit) || undefined : undefined, last4: last4 || undefined, minBalance: !isCard && num(minBal) > 0 ? num(minBal) : undefined, minFee: !isCard && num(minBal) > 0 && num(minFee) > 0 ? num(minFee) : undefined, primary: !isCard && kind !== 'savings' ? primary : false } : (primary && !isCard && a.profileId === ex.profileId && a.primary ? { ...a, primary: false } : a))),
        transactions: Math.abs(diff) >= 0.01 ? [...s.transactions, { id: uid(), createdAt: Date.now(), profileId: ex.profileId, type: 'adjust', amount: diff, date: today, accountId: ex.id, note: 'Balance adjustment' }] : s.transactions,
      }), { toast: 'Account updated' });
    } else {
      const a: Account = {
        id: uid(), profileId: owner, name: name.trim(), kind, startDate: today,
        startingBalance: isCard ? -entered : neg ? -entered : entered,
        limit: isCard ? num(limit) || undefined : undefined, last4: last4 || undefined,
        minBalance: !isCard && num(minBal) > 0 ? num(minBal) : undefined, minFee: !isCard && num(minBal) > 0 && num(minFee) > 0 ? num(minFee) : undefined,
        primary: !isCard && kind !== 'savings' ? primary : false,
      };
      update((s) => ({ ...s, accounts: [...s.accounts.map((x) => (a.primary && x.profileId === owner && x.primary ? { ...x, primary: false } : x)), a] }), { toast: `${a.name} added` });
    }
    closeModal();
  };
  const remove = () => {
    if (!ex) return;
    if (!confirm(`Delete ${ex.name} and everything recorded against it?`)) return;
    update((s) => deleteAccount(s, ex.id), { undo: `${ex.name} deleted` });
    closeModal();
  };

  return (
    <Sheet title={ex ? 'Edit account' : 'Add account'} onClose={closeModal}>
      {!ex && (
        <div className="kind-grid">
          {ACCOUNT_KINDS.map((k) => (
            <button key={k.value} type="button" className="kind-opt" aria-pressed={kind === k.value} onClick={() => setKind(k.value)}>
              <span className="tile sm" style={{ ['--c' as string]: k.color }}><Icon name={k.icon} /></span>
              <span>{k.label}<small>{k.hint}</small></span>
            </button>
          ))}
        </div>
      )}
      {!ex && state.profiles.length > 1 && (
        <Field label="Whose account is it?">
          <select value={owner} onChange={(e) => setOwner(e.target.value)}>{state.profiles.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
        </Field>
      )}
      <div className="row">
        <Field label="Name"><input data-af="1" value={name} placeholder={placeholder} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="Last 4 digits (optional)"><input inputMode="numeric" maxLength={4} value={last4} placeholder="1234" onChange={(e) => setLast4(e.target.value.replace(/\D/g, ''))} /></Field>
      </div>
      <MoneyInput
        label={isCard ? 'Balance you owe right now' : ex ? 'Current balance' : 'Starting balance (today)'}
        value={start} onChange={setStart}
        hint={isCard ? 'The amount currently owed. Charges add to it; due payments bring it down.' : ex ? 'Changing this records an adjustment, so your history stays intact.' : 'What the account holds today. Everything you log from here moves it.'}
      />
      {!isCard && <Toggle checked={neg} onChange={setNeg} label="Balance is overdrawn" sub="Turn on if the account is currently negative" />}
      {!isCard && kind !== 'cash' && (
        <div className="stack">
          <div className="row keep">
            <MoneyInput label="Minimum balance (optional)" value={minBal} onChange={setMinBal} placeholder="e.g. 6000" />
            <MoneyInput label="Fee if below" value={minFee} onChange={setMinFee} placeholder="e.g. 15" />
          </div>
          <span className="help">Many banks charge a monthly fee when the balance drops under a threshold (TD, for example). Set it and Budge warns you before you cross it, in the forecast and in “Can I afford it?”.</span>
        </div>
      )}
      {isCard && <MoneyInput label="Credit limit (optional)" value={limit} onChange={setLimit} hint="Lets us show how much of the limit you're using." />}
      {!isCard && kind !== 'savings' && <Toggle checked={primary} onChange={setPrimary} label="Main spending account" sub="Everyday spending and the forecast come out of this one" />}
      <div className="dlg-foot">
        {ex && <button type="button" className="btn danger" onClick={remove}><Trash2 /> Delete</button>}
        <span className="spacer" />
        <button type="button" className="btn primary" disabled={!name.trim()} onClick={save}><Check /> {ex ? 'Save' : 'Add account'}</button>
      </div>
    </Sheet>
  );
}

/* ───────── Card due / one-off bill ───────── */
export function DueForm({ id, accountId }: { id?: string; accountId?: string }) {
  const { state, today, scope, update, closeModal, fmt } = useApp();
  const ex = id ? state.dues.find((d) => d.id === id) : undefined;
  const inScopeAccts = state.accounts.filter((a) => !a.archived && (scope.includes(a.profileId) || a.id === ex?.accountId));
  const cards = inScopeAccts.filter((a) => a.kind === 'credit');
  const banks = inScopeAccts.filter((a) => a.kind !== 'credit');
  const [target, setTarget] = useState<string>(ex ? ex.accountId ?? '' : accountId ?? cards[0]?.id ?? '');
  const card = cards.find((c) => c.id === target);
  const [name, setName] = useState(ex?.name ?? '');
  const [amount, setAmount] = useState(ex ? String(ex.amount) : '');
  const [date, setDate] = useState(ex?.date ?? today);
  const [from, setFrom] = useState(ex?.payFromId ?? banks.find((b) => b.profileId === card?.profileId && b.primary)?.id ?? banks.find((b) => b.profileId === card?.profileId)?.id ?? banks[0]?.id ?? '');
  const [cat, setCat] = useState(ex?.categoryId ?? 'housing');
  const amt = num(amount);
  const owner = card?.profileId ?? banks.find((b) => b.id === from)?.profileId ?? state.profiles[0].id;
  const label = name.trim() || (card ? `${card.name} payment` : 'Bill');
  const valid = amt > 0 && !!from && !!date;

  if (!banks.length) {
    return <Sheet title="Add due" onClose={closeModal}><p className="help">Add a bank account first — dues are paid out of one.</p></Sheet>;
  }

  const save = () => {
    if (!valid) return;
    const d: Due = { id: ex?.id ?? uid(), profileId: owner, name: label, amount: amt, date, accountId: target || undefined, payFromId: from, categoryId: target ? undefined : cat, status: ex?.status === 'paid' ? 'paid' : 'open', txId: ex?.txId };
    update((s) => ({ ...s, dues: ex ? s.dues.map((x) => (x.id === ex.id ? d : x)) : [...s.dues, d] }), {
      toast: date <= today && !ex ? `${fmt(amt)} paid from your account today` : `Due added · ${fmt(amt)}`,
    });
    closeModal();
  };
  const remove = () => { if (ex) { update((s) => ({ ...s, dues: s.dues.filter((x) => x.id !== ex.id) }), { undo: 'Due removed' }); closeModal(); } };

  return (
    <Sheet title={ex ? 'Edit due' : 'Add due amount'} onClose={closeModal}>
      <p className="help">On the due date, the amount is taken from the bank account you pick{card ? ` and applied to ${card.name}` : ''}. It also shows up in your forecast.</p>
      <Field label="What is it for?">
        <select value={target} onChange={(e) => { setTarget(e.target.value); const c = cards.find((x) => x.id === e.target.value); if (c) { const b = banks.find((x) => x.profileId === c.profileId && x.primary) ?? banks.find((x) => x.profileId === c.profileId); if (b) setFrom(b.id); } }}>
          {cards.map((c) => <option key={c.id} value={c.id}>{c.name} payment</option>)}
          <option value="">One-off bill (not a card)</option>
        </select>
      </Field>
      {!card && <Field label="Bill name"><input value={name} placeholder="e.g. Property tax" onChange={(e) => setName(e.target.value)} /></Field>}
      {card && <Field label="Label (optional)"><input value={name} placeholder={`${card.name} payment`} onChange={(e) => setName(e.target.value)} /></Field>}
      <div className="row keep">
        <MoneyInput label="Amount due" value={amount} onChange={setAmount} autoFocus />
        <Field label="Due date"><DateInput value={date} onChange={setDate} /></Field>
      </div>
      <Field label="Deduct from"><AccountSelect value={from} onChange={setFrom} accounts={banks} /></Field>
      {!card && (
        <Field label="Category">
          <select value={cat} onChange={(e) => setCat(e.target.value)}>{state.categories.filter((c) => c.kind === 'expense').map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        </Field>
      )}
      <div className="dlg-foot">
        {ex && <button type="button" className="btn danger" onClick={remove}><Trash2 /> Remove</button>}
        <span className="spacer" />
        <button type="button" className="btn primary" disabled={!valid} onClick={save}><Check /> {ex ? 'Save' : 'Add due'}</button>
      </div>
    </Sheet>
  );
}

/* ───────── Reconcile balance ───────── */
export function AdjustForm({ accountId }: { accountId: string }) {
  const { state, today, bal, update, closeModal, fmt } = useApp();
  const a = state.accounts.find((x) => x.id === accountId)!;
  const cur = bal[accountId] ?? 0;
  const isCard = a.kind === 'credit';
  const [v, setV] = useState('');
  const want = isCard ? -num(v) : num(v);
  const diff = round2(want - cur);
  return (
    <Sheet title="Update balance" onClose={closeModal}>
      <p className="help">Match {a.name} to what your bank or card app says right now. We'll record the difference as an adjustment.</p>
      <MoneyInput label={isCard ? 'Amount owed per your card app' : 'Balance per your bank'} value={v} onChange={setV} autoFocus />
      {v !== '' && <div className={`callout ${Math.abs(diff) < 0.01 ? 'good' : 'warn'}`}>{Math.abs(diff) < 0.01 ? 'Already matches.' : `Budge currently shows ${fmt(isCard ? -cur : cur)}. We'll adjust by ${fmt(diff, { sign: true })}.`}</div>}
      <div className="dlg-foot"><span className="spacer" />
        <button type="button" className="btn primary" disabled={v === '' || Math.abs(diff) < 0.01} onClick={() => {
          update((s) => ({ ...s, transactions: [...s.transactions, { id: uid(), createdAt: Date.now(), profileId: a.profileId, type: 'adjust', amount: diff, date: today, accountId, note: 'Balance adjustment' }] }), { toast: 'Balance updated' });
          closeModal();
        }}><Check /> Update</button>
      </div>
    </Sheet>
  );
}
