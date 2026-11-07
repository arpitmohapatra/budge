import { useMemo, useState } from 'react';
import { Check, Trash2 } from 'lucide-react';
import { Icon } from '../ui/Icon';
import { BigAmount, Field, Sheet, Seg, num } from '../ui/kit';
import { accountsFor, deleteTransaction, useApp } from '../lib/store';
import { primaryAccount, uid } from '../lib/ledger';
import type { Account, Transaction, TxType } from '../lib/types';

/** Account <select>, grouped by owner when more than one person is in view. */
export function AccountSelect({ value, onChange, accounts, allowNone, noneLabel = '— none —' }: { value: string; onChange: (v: string) => void; accounts: Account[]; allowNone?: boolean; noneLabel?: string }) {
  const { state } = useApp();
  const multi = new Set(accounts.map((a) => a.profileId)).size > 1;
  const opt = (a: Account) => <option key={a.id} value={a.id}>{a.name}{a.last4 ? ` ··${a.last4}` : ''}</option>;
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      {allowNone && <option value="">{noneLabel}</option>}
      {multi
        ? state.profiles.map((p) => {
            const mine = accounts.filter((a) => a.profileId === p.id);
            return mine.length ? <optgroup key={p.id} label={p.name}>{mine.map(opt)}</optgroup> : null;
          })
        : accounts.map(opt)}
    </select>
  );
}

export function useDefaultAccount(kinds?: Account['kind'][]) {
  const { state, scope, view } = useApp();
  const list = accountsFor(state, scope, { kinds });
  const first = scope.length === 1 ? primaryAccount(state, scope[0]) : undefined;
  return { list, def: (first && list.includes(first) ? first : list.find((a) => a.primary) ?? list[0])?.id ?? '', view };
}

export default function TxForm({ id, preset }: { id?: string; preset?: { type?: TxType; categoryId?: string; note?: string; amount?: number; date?: string; accountId?: string } }) {
  const { state, today, update, closeModal, openModal, celebrate, fmt } = useApp();
  const existing = id ? state.transactions.find((t) => t.id === id) : undefined;
  const accts = state.accounts.filter((a) => !a.archived || a.id === existing?.accountId);
  const { def } = useDefaultAccount();
  const [type, setType] = useState<TxType>(existing?.type ?? preset?.type ?? 'expense');
  const [amount, setAmount] = useState(existing ? String(Math.abs(existing.amount)) : preset?.amount ? String(preset.amount) : '');
  const [cat, setCat] = useState(existing?.categoryId ?? preset?.categoryId ?? '');
  const [note, setNote] = useState(existing?.note ?? preset?.note ?? '');
  const [date, setDate] = useState(existing?.date ?? preset?.date ?? today);
  const [accountId, setAccountId] = useState(existing?.accountId ?? preset?.accountId ?? def);
  const [toId, setToId] = useState(existing?.toAccountId ?? '');
  const cats = useMemo(() => state.categories.filter((c) => c.kind === (type === 'income' ? 'income' : 'expense')), [state.categories, type]);
  const amt = num(amount);
  const from = accts.find((a) => a.id === accountId);

  if (!accts.length) {
    return (
      <Sheet title="Add a transaction" onClose={closeModal}>
        <p className="help">Add a bank account or card first — then every expense and paycheck has a home.</p>
        <div className="dlg-foot"><button className="btn primary" onClick={() => openModal('account')}>Add an account</button></div>
      </Sheet>
    );
  }

  const valid = amt > 0 && !!from && (type !== 'transfer' || (!!toId && toId !== accountId));
  const save = () => {
    if (!valid || !from) return;
    const base: Transaction = {
      id: existing?.id ?? uid(), createdAt: existing?.createdAt ?? Date.now(), profileId: from.profileId, type, amount: amt, date, accountId,
      categoryId: type === 'transfer' ? undefined : cat || (type === 'income' ? 'income-other' : 'other'), note: note.trim() || undefined,
      toAccountId: type === 'transfer' ? toId : undefined, recurringId: existing?.recurringId, dueId: existing?.dueId,
    };
    update((s) => ({ ...s, transactions: existing ? s.transactions.map((t) => (t.id === existing.id ? base : t)) : [...s.transactions, base] }), {
      toast: existing ? 'Saved' : type === 'income' ? `Added ${fmt(amt)} income` : type === 'transfer' ? `Moved ${fmt(amt)}` : `Logged ${fmt(amt)}${note.trim() ? ` · ${note.trim()}` : ''}`,
    });
    if (!existing && type === 'income') celebrate();
    closeModal();
  };
  const remove = () => {
    if (!existing) return;
    update((s) => deleteTransaction(s, existing.id), { undo: 'Transaction deleted' });
    closeModal();
  };

  return (
    <Sheet title={existing ? 'Edit transaction' : type === 'income' ? 'Add income' : type === 'transfer' ? 'Move money' : 'Add expense'} onClose={closeModal}>
      {existing?.type === 'adjust' ? <p className="help">Balance adjustments can only be deleted.</p> : (
        <>
          <Seg<TxType> value={type} onChange={setType} label="Type" options={[{ value: 'expense', label: 'Expense' }, { value: 'income', label: 'Income' }, { value: 'transfer', label: 'Transfer' }]} />
          <BigAmount value={amount} onChange={setAmount} autoFocus={!existing} />
          {type === 'expense' && (
            <div className="chips">
              <button type="button" className="chip" aria-pressed={cat === 'cash'} onClick={() => { setCat('cash'); if (!note) setNote('Cash withdrawal'); }}><Icon name="cash" size={14} /> Cash withdrawal</button>
            </div>
          )}
          {type !== 'transfer' && (
            <div className="field">
              <span className="label">Category</span>
              <div className="cat-grid">
                {cats.map((c) => (
                  <button key={c.id} type="button" className="cat-opt" aria-pressed={cat === c.id} style={{ ['--c' as string]: c.color }} onClick={() => setCat(c.id)}>
                    <span className="tile sm" style={{ ['--c' as string]: c.color }}><Icon name={c.icon} /></span>{c.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="row">
            <Field label={type === 'income' ? 'Deposit to' : type === 'transfer' ? 'From' : 'Paid from'}>
              <AccountSelect value={accountId} onChange={setAccountId} accounts={accts} />
            </Field>
            {type === 'transfer' ? (
              <Field label="To" hint="Paying a card? Pick it here.">
                <AccountSelect value={toId} onChange={setToId} accounts={accts.filter((a) => a.id !== accountId)} allowNone noneLabel="Choose account…" />
              </Field>
            ) : (
              <Field label="Date"><input type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} /></Field>
            )}
          </div>
          {type === 'transfer' && <Field label="Date"><input type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} /></Field>}
          <Field label="Note"><input value={note} placeholder={type === 'income' ? 'e.g. Freelance gig' : 'What was it?'} onChange={(e) => setNote(e.target.value)} /></Field>
          {from && type === 'expense' && from.kind === 'credit' && <p className="help"><Icon name="card" size={13} /> Charged to a card — your cash stays put until the card's due date.</p>}
        </>
      )}
      <div className="dlg-foot">
        {existing && <button type="button" className="btn danger" onClick={remove}><Trash2 /> Delete</button>}
        <span className="spacer" />
        {existing?.type !== 'adjust' && <button type="button" className="btn primary" disabled={!valid} onClick={save}><Check /> {existing ? 'Save' : 'Add'}</button>}
      </div>
    </Sheet>
  );
}
