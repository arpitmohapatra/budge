import { useRef } from 'react';
import { Download, FlaskConical, Moon, Sun, Trash2, Upload, Users } from 'lucide-react';
import { download, exportAll, exportProfile, importProfile, parseBackup } from '../lib/backup';
import { demoState, emptyState } from '../lib/demo';
import { PROFILE_COLORS } from '../lib/ledger';
import { useApp } from '../lib/store';
import { Avatar, Field, MoneyInput, Seg, Toggle, num } from '../ui/kit';
import { SyncCard } from '../sync/SyncUI';
import { useHubState } from '../sync/hub';

const CURRENCIES = ['USD', 'CAD', 'EUR', 'GBP', 'INR', 'AUD', 'JPY'];

export default function Settings() {
  const { state, today, update, replaceAll, toast, fmt0 } = useApp();
  const s = state.settings;
  const file = useRef<HTMLInputElement>(null);
  const hs = useHubState();
  const set = (patch: Partial<typeof s>) => update((st) => ({ ...st, settings: { ...st.settings, ...patch } }));

  const onFile = async (f?: File) => {
    if (!f) return;
    try {
      const r = parseBackup(await f.text());
      if (r.type === 'all') {
        if (!confirm('Replace everything in Budge with this backup?')) return;
        replaceAll(r.state); toast('Backup restored');
      } else {
        if (!confirm(`Replace ${r.file.profile.name}'s data with this file? Everyone else stays as is.`)) return;
        update((st) => importProfile(st, r.file), { undo: `${r.file.profile.name}'s data imported` });
      }
    } catch (e) { toast((e as Error).message); }
    if (file.current) file.current.value = '';
  };

  return (
    <>
      <div className="page-head reveal"><div className="titles"><h1 className="display">Settings</h1><p className="subline">Profiles, forecast rules and backups</p></div></div>

      <section className="card reveal">
        <div className="card-head"><h3>People</h3><Users className="muted" size={20} /></div>
        {state.profiles.map((p) => (
          <div key={p.id} className="set-row">
            <Avatar profile={p} size="lg" />
            <Field label="Name"><input value={p.name} onChange={(e) => update((st) => ({ ...st, profiles: st.profiles.map((x) => (x.id === p.id ? { ...x, name: e.target.value } : x)) }))} /></Field>
            <div className="swatches" role="group" aria-label={`${p.name} colour`}>
              {PROFILE_COLORS.map((c) => <button key={c} type="button" className="swatch" aria-pressed={p.color === c} aria-label={c} style={{ ['--c' as string]: c }} onClick={() => update((st) => ({ ...st, profiles: st.profiles.map((x) => (x.id === p.id ? { ...x, color: c } : x)) }))} />)}
            </div>
          </div>
        ))}
      </section>

      <section className="card reveal">
        <div className="card-head"><h3>Forecast rules</h3></div>
        <div className="row">
          <MoneyInput label="Safety cushion" value={String(s.buffer)} onChange={(v) => set({ buffer: num(v) })} hint="Never-touch money. Forecasts flag “tight” when you'd dip below it." />
          <Field label="Average spending looks back" hint="Everyday spending only — bills and card payments are excluded.">
            <select value={s.windowDays} onChange={(e) => set({ windowDays: Number(e.target.value) })}>{[30, 60, 90].map((d) => <option key={d} value={d}>{d} days</option>)}</select>
          </Field>
        </div>
        {state.profiles.map((p) => (
          <MoneyInput key={p.id} label={`${p.name}: assume this much spending per day (optional)`} value={s.dailyOverride[p.id] !== undefined ? String(s.dailyOverride[p.id]) : ''} placeholder="Auto from history"
            onChange={(v) => update((st) => { const o = { ...st.settings.dailyOverride }; if (v === '') delete o[p.id]; else o[p.id] = num(v); return { ...st, settings: { ...st.settings, dailyOverride: o } }; })} />
        ))}
        <Toggle checked={s.includeSavings} onChange={(b) => set({ includeSavings: b })} label="Count savings accounts as spendable cash" sub="Off (recommended): forecasts and “can I afford it” use checking and cash only" />
        <p className="help">Pay-day rule: when a scheduled pay date lands on a weekend or US federal holiday, it moves to the last business day before it. Set per paycheck under Bills & income.</p>
      </section>

      <section className="card reveal">
        <div className="card-head"><h3>Look & currency</h3></div>
        <div className="row">
          <Field label="Currency"><select value={s.currency} onChange={(e) => set({ currency: e.target.value })}>{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</select></Field>
          <div className="field"><span className="label">Theme</span><Seg value={s.theme} onChange={(v) => set({ theme: v })} options={[{ value: 'auto', label: 'Auto' }, { value: 'light', label: <><Sun /> Light</> }, { value: 'dark', label: <><Moon /> Dark</> }]} /></div>
        </div>
      </section>

      <SyncCard />

      <section className="card reveal">
        <div className="card-head"><h3>Backup & sharing</h3></div>
        <p className="help">Without sync, Budge keeps everything on this device. These files are for manual backups or moving data around: a full backup, or just one person’s numbers (importing replaces only that person’s data).</p>
        <div className="actions">
          <button className="btn" onClick={() => download(`budge-backup-${today}.json`, exportAll(state))}><Download /> Full backup</button>
          {state.profiles.map((p) => <button key={p.id} className="btn" onClick={() => download(`budge-${p.name.toLowerCase().replace(/\W+/g, '-')}-${today}.json`, exportProfile(state, p.id))}><Download /> {p.name}'s data</button>)}
          <button className="btn" onClick={() => file.current?.click()}><Upload /> Import file</button>
          <input ref={file} type="file" accept="application/json,.json" hidden onChange={(e) => onFile(e.target.files?.[0])} />
        </div>
      </section>

      <section className="card reveal">
        <div className="card-head"><h3>Data</h3></div>
        <div className="actions">
          <button className="btn" onClick={() => { if (confirm(hs.configured ? 'Replace your data with a sample household? Sync is on, so your other phone will get it too. Export a backup first.' : 'Replace your data with a sample household? (Your current data will be lost — export a backup first.)')) { replaceAll(demoState(today, [state.profiles[0].name, state.profiles[1]?.name ?? 'Wife'])); toast('Sample data loaded'); } }}><FlaskConical /> Load sample data</button>
          <button className="btn danger" onClick={() => { if (confirm(hs.configured ? 'Erase everything? Sync is on, so this ALSO erases the copy on your other phone and the hub. This cannot be undone.' : 'Erase everything in Budge on this device? This cannot be undone.')) { const e = emptyState(); replaceAll({ ...e, onboarded: true, profiles: state.profiles, settings: state.settings }); toast('All data erased'); } }}><Trash2 /> Erase all data</button>
        </div>
        <p className="help">Buffer {fmt0(s.buffer)} · {state.accounts.length} accounts · {state.transactions.length} transactions</p>
      </section>
    </>
  );
}
