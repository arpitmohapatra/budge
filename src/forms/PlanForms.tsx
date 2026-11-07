import { useMemo, useState } from 'react';
import { Check, Trash2 } from 'lucide-react';
import { CatTile, Icon } from '../ui/Icon';
import { Field, MoneyInput, Sheet, Toggle, num } from '../ui/kit';
import { useApp } from '../lib/store';
import { addDaysYMD, FREQUENCIES, fmtDate, occurrencesBetween, monthOf, ordinal } from '../lib/dates';
import { primaryAccount, spendByCategory, uid } from '../lib/ledger';
import { addMonthsYM, monthEnd, monthStart } from '../lib/dates';
import { FAMILY, type Frequency, type Recurring } from '../lib/types';
import { AccountSelect } from './TxForm';

/* ───────── Recurring bill or paycheck ───────── */
export function RecurringForm({ id, kind: presetKind }: { id?: string; kind?: 'income' | 'expense' }) {
  const { state, today, scope, view, update, closeModal, fmt, openModal } = useApp();
  const ex = id ? state.recurring.find((r) => r.id === id) : undefined;
  const kind = ex?.kind ?? presetKind ?? 'expense';
  const isIncome = kind === 'income';
  const firstOwner = view !== FAMILY ? view : scope[0];
  const accts = state.accounts.filter((a) => !a.archived && (scope.includes(a.profileId) || a.id === ex?.accountId) && (!isIncome || a.kind !== 'credit'));
  const defAcct = (primaryAccount(state, firstOwner)?.id ?? accts[0]?.id) ?? '';

  const [name, setName] = useState(ex?.name ?? (isIncome ? 'Paycheck' : ''));
  const [amount, setAmount] = useState(ex ? String(ex.amount) : '');
  const [freq, setFreq] = useState<Frequency>(ex?.frequency ?? (isIncome ? 'semimonthly' : 'monthly'));
  const [d1, setD1] = useState(String(ex?.days?.[0] ?? 7));
  const [d2, setD2] = useState(String(ex?.days?.[1] ?? 22));
  const [rollBack, setRollBack] = useState(ex?.rollBack ?? isIncome);
  const [anchor, setAnchor] = useState(ex?.anchor ?? addDaysYMD(today, isIncome ? 7 : 1));
  const [accountId, setAccountId] = useState(ex?.accountId ?? (accts.find((a) => a.id === defAcct) ? defAcct : accts[0]?.id ?? ''));
  const [cat, setCat] = useState(ex?.categoryId ?? (isIncome ? 'paycheck' : 'subscriptions'));
  const [active, setActive] = useState(ex?.active ?? true);
  const [end, setEnd] = useState(ex?.endDate ?? '');

  const days = useMemo<[number, number]>(() => {
    const a = Math.min(31, Math.max(1, Math.round(num(d1)) || 7)), b = Math.min(31, Math.max(1, Math.round(num(d2)) || 22));
    return a <= b ? [a, b] : [b, a];
  }, [d1, d2]);
  const preview = useMemo(() => occurrencesBetween(anchor, freq, today, addDaysYMD(today, 150), end || undefined, { days, rollBack }).slice(0, 5), [anchor, freq, today, end, days, rollBack]);
  const nominalNote = useMemo(() => {
    if (!rollBack) return new Set<string>();
    const raw = occurrencesBetween(anchor, freq, today, addDaysYMD(today, 150), end || undefined, { days, rollBack: false });
    return new Set(raw);
  }, [anchor, freq, today, end, days, rollBack]);

  const amt = num(amount);
  const valid = amt > 0 && !!accountId && name.trim().length > 0;
  const acct = state.accounts.find((a) => a.id === accountId);

  if (!accts.length) return <Sheet title="Add" onClose={closeModal}><p className="help">Add an account first.</p><div className="dlg-foot"><button className="btn primary" onClick={() => openModal('account')}>Add an account</button></div></Sheet>;

  const save = () => {
    if (!valid || !acct) return;
    const r: Recurring = {
      id: ex?.id ?? uid(), profileId: ex?.profileId ?? acct.profileId, kind, name: name.trim(), amount: amt, frequency: freq,
      days: freq === 'semimonthly' ? days : undefined, rollBack, anchor: freq === 'semimonthly' ? (ex?.anchor ?? today) : anchor,
      postedThrough: ex?.postedThrough ?? addDaysYMD(today, -1), accountId, categoryId: cat, endDate: end || undefined, active,
    };
    update((s) => ({ ...s, recurring: ex ? s.recurring.map((x) => (x.id === ex.id ? r : x)) : [...s.recurring, r] }), { toast: ex ? 'Saved' : isIncome ? `Income schedule added — next ${fmtDate(preview[0] ?? today, 'EEE, MMM d')}` : `${r.name} scheduled` });
    closeModal();
  };
  const remove = () => { if (ex) { update((s) => ({ ...s, recurring: s.recurring.filter((x) => x.id !== ex.id) }), { undo: `${ex.name} removed` }); closeModal(); } };

  return (
    <Sheet title={ex ? (isIncome ? 'Edit income' : 'Edit recurring') : isIncome ? 'Add income' : 'Add recurring bill'} onClose={closeModal}>
      <div className="row keep">
        <Field label="Name"><input value={name} placeholder={isIncome ? 'Paycheck' : 'e.g. Rent, Netflix'} onChange={(e) => setName(e.target.value)} /></Field>
        <MoneyInput label={isIncome ? 'Pay amount' : 'Amount'} value={amount} onChange={setAmount} autoFocus={!ex} />
      </div>
      <Field label="How often?">
        <select value={freq} onChange={(e) => setFreq(e.target.value as Frequency)}>
          {FREQUENCIES.map((f) => <option key={f.value} value={f.value}>{f.value === 'semimonthly' ? `Twice a month (${ordinal(days[0])} & ${ordinal(days[1])})` : f.label}</option>)}
        </select>
      </Field>
      {freq === 'semimonthly' ? (
        <div className="row keep">
          <Field label="First pay day of month"><input inputMode="numeric" value={d1} onChange={(e) => setD1(e.target.value.replace(/\D/g, '').slice(0, 2))} /></Field>
          <Field label="Second pay day of month"><input inputMode="numeric" value={d2} onChange={(e) => setD2(e.target.value.replace(/\D/g, '').slice(0, 2))} /></Field>
        </div>
      ) : (
        <Field label={isIncome ? 'Next pay date' : 'Next date'}><input type="date" value={anchor} onChange={(e) => setAnchor(e.target.value)} /></Field>
      )}
      <Toggle checked={rollBack} onChange={setRollBack} label="Weekend or holiday? Pay the day before" sub="Moves to the last business day before the weekend/holiday (US federal holidays)" />
      <div className="field">
        <span className="label">Upcoming dates</span>
        <div className="chips">
          {preview.map((d) => (
            <span key={d} className="pill info" title={nominalNote.has(d) ? '' : 'Moved off a weekend/holiday'}>
              <Icon name="calendar" size={12} /> {fmtDate(d, 'EEE, MMM d')}{!nominalNote.has(d) && rollBack ? ' · moved up' : ''}
            </span>
          ))}
          {!preview.length && <span className="muted">No upcoming dates</span>}
        </div>
      </div>
      <div className="row">
        <Field label={isIncome ? 'Deposited into' : 'Charged to'}><AccountSelect value={accountId} onChange={setAccountId} accounts={accts} /></Field>
        {!isIncome && (
          <Field label="Category">
            <select value={cat} onChange={(e) => setCat(e.target.value)}>{state.categories.filter((c) => c.kind === 'expense').map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
          </Field>
        )}
      </div>
      {ex && (
        <>
          <Field label="Ends on (optional)"><input type="date" value={end} onChange={(e) => setEnd(e.target.value)} /></Field>
          <Toggle checked={active} onChange={setActive} label="Active" sub="Pause to stop posting and exclude it from the forecast" />
        </>
      )}
      <p className="help">{isIncome ? `Each pay date, ${fmt(amt || 0)} lands in ${acct?.name ?? 'your account'} automatically. Change the amount later and only future paychecks use it.` : `Posts automatically on its date and counts against your budget and forecast.`}</p>
      <div className="dlg-foot">
        {ex && <button type="button" className="btn danger" onClick={remove}><Trash2 /> Delete</button>}
        <span className="spacer" />
        <button type="button" className="btn primary" disabled={!valid} onClick={save}><Check /> {ex ? 'Save' : 'Add'}</button>
      </div>
    </Sheet>
  );
}

/* ───────── Budget ───────── */
export function BudgetForm({ id, categoryId, profileId }: { id?: string; categoryId?: string; profileId?: string }) {
  const { state, today, view, update, closeModal, fmt0 } = useApp();
  const ex = id ? state.budgets.find((b) => b.id === id) : undefined;
  const [owner, setOwner] = useState(ex?.profileId ?? profileId ?? (view !== FAMILY ? view : state.profiles[0].id));
  const used = new Set(state.budgets.filter((b) => b.profileId === owner && b.id !== ex?.id).map((b) => b.categoryId));
  const cats = state.categories.filter((c) => c.kind === 'expense' && (!used.has(c.id) || c.id === ex?.categoryId));
  const [cat, setCat] = useState(ex?.categoryId ?? categoryId ?? cats[0]?.id ?? '');
  const [amount, setAmount] = useState(ex ? String(ex.amount) : '');

  const hist = useMemo(() => {
    const cur = monthOf(today), prev3 = addMonthsYM(cur, -3);
    const past = spendByCategory(state, [owner], monthStart(prev3), monthEnd(addMonthsYM(cur, -1))).get(cat) ?? 0;
    const mtd = spendByCategory(state, [owner], monthStart(cur), today).get(cat) ?? 0;
    return { avg: Math.round(past / 3), mtd };
  }, [state, owner, cat, today]);
  const category = state.categories.find((c) => c.id === cat);
  const amt = num(amount);

  const save = () => {
    if (!cat || amt <= 0) return;
    update((s) => ({ ...s, budgets: ex ? s.budgets.map((b) => (b.id === ex.id ? { ...b, categoryId: cat, amount: amt } : b)) : [...s.budgets, { id: uid(), profileId: owner, categoryId: cat, amount: amt }] }), { toast: `${category?.name} budget set to ${fmt0(amt)}/mo` });
    closeModal();
  };

  return (
    <Sheet title={ex ? 'Edit budget' : 'New monthly budget'} onClose={closeModal}>
      {!ex && state.profiles.length > 1 && (
        <Field label="Whose budget?">
          <select value={owner} onChange={(e) => { setOwner(e.target.value); setCat(''); }}>{state.profiles.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
        </Field>
      )}
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
      <MoneyInput label="Monthly limit" value={amount} onChange={setAmount} autoFocus />
      {cat && (
        <div className="chips">
          {hist.avg > 0 && <button type="button" className="chip" onClick={() => setAmount(String(Math.ceil(hist.avg / 5) * 5))}>3-mo average {fmt0(hist.avg)} · use</button>}
          {hist.mtd > 0 && <span className="pill mute"><CatTile cat={category} size="sm" /> {fmt0(hist.mtd)} so far this month</span>}
        </div>
      )}
      <div className="dlg-foot">
        {ex && <button type="button" className="btn danger" onClick={() => { update((s) => ({ ...s, budgets: s.budgets.filter((b) => b.id !== ex.id) }), { undo: 'Budget removed' }); closeModal(); }}><Trash2 /> Remove</button>}
        <span className="spacer" />
        <button type="button" className="btn primary" disabled={!cat || amt <= 0} onClick={save}><Check /> {ex ? 'Save' : 'Set budget'}</button>
      </div>
    </Sheet>
  );
}
