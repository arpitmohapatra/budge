import { useState } from 'react';
import { Cloud, CloudOff, Link2, RefreshCw, ShieldCheck, Unplug } from 'lucide-react';
import { fmtAgo } from './time';
import { connectHub, disconnectHub, hub, useHubState } from './hub';
import { PassphraseError } from '../hub/hub';

/** Tiny status line for the sidebar / top bar. */
export function SyncChip() {
  const s = useHubState();
  if (!s.configured) return null;
  const label = s.status === 'syncing' ? 'Syncing…' : s.status === 'offline' ? `Offline${s.pending ? ` · ${s.pending} waiting` : ''}` : s.status === 'error' ? 'Sync problem' : s.pending ? `${s.pending} waiting` : s.lastSyncAt ? `Synced ${fmtAgo(s.lastSyncAt)}` : 'Connected';
  return (
    <button type="button" className={`sync-chip ${s.status}`} onClick={() => void hub.sync()} title={s.error ?? 'Tap to sync now'}>
      {s.status === 'offline' ? <CloudOff size={14} /> : <Cloud size={14} />}<span>{label}</span>
    </button>
  );
}

export function ConnectForm({ onDone }: { onDone?: () => void }) {
  const [url, setUrl] = useState('');
  const [apiKey, setKey] = useState('');
  const [pass, setPass] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const go = async () => {
    setBusy(true); setErr('');
    try { await connectHub({ url, apiKey, passphrase: pass }); setPass(''); onDone?.(); }
    catch (e) { setErr(e instanceof PassphraseError ? 'That passphrase doesn’t match the data already stored. Use the same passphrase you set on your other phone.' : e instanceof TypeError ? 'Couldn’t reach the hub. Check the URL and your connection.' : (e as Error).message); }
    finally { setBusy(false); }
  };
  return (
    <div className="stack">
      <div className="field"><label>Hub URL</label><input value={url} placeholder="https://hub.yourname.workers.dev" autoCapitalize="none" autoCorrect="off" spellCheck={false} onChange={(e) => setUrl(e.target.value)} /></div>
      <div className="field"><label>App key</label><input value={apiKey} type="password" autoComplete="off" autoCapitalize="none" spellCheck={false} placeholder="Paste the Budge key" onChange={(e) => setKey(e.target.value)} /></div>
      <div className="field"><label>Passphrase</label><input value={pass} type="password" autoComplete="off" placeholder="Same on every phone" onChange={(e) => setPass(e.target.value)} />
        <span className="hint">Encrypts your data on this phone before it leaves. It isn’t stored or sent anywhere — and if you lose it, synced data can’t be recovered.</span></div>
      {err && <div className="callout bad" role="alert">{err}</div>}
      <div className="actions"><button className="btn primary" disabled={busy || !url || !apiKey || pass.length < 8} onClick={go}><Link2 /> {busy ? 'Connecting…' : 'Connect'}</button></div>
      {pass.length > 0 && pass.length < 8 && <span className="hint">Use at least 8 characters — a few random words is ideal.</span>}
    </div>
  );
}

export function SyncCard() {
  const s = useHubState();
  const [busy, setBusy] = useState(false);
  return (
    <section className="card reveal">
      <div className="card-head"><h3>Sync between phones</h3><ShieldCheck className="muted" size={20} /></div>
      {!s.configured ? (
        <>
          <p className="help">Keep you and your wife’s phones in step. Data is encrypted on your phone before it’s uploaded; the server only stores scrambled data. Budge keeps working offline and catches up when you’re back online.</p>
          <ConnectForm />
        </>
      ) : (
        <>
          <div className={`callout ${s.status === 'error' ? 'bad' : s.status === 'offline' ? 'warn' : 'good'}`}>
            {s.status === 'offline' ? <CloudOff /> : <Cloud />}
            <span>
              {s.status === 'syncing' ? 'Syncing…' : s.status === 'offline' ? `You’re offline — ${s.pending} change${s.pending === 1 ? '' : 's'} will upload when you’re back.` : s.status === 'error' ? `Sync problem: ${s.error}` : s.lastSyncAt ? `Up to date · last synced ${fmtAgo(s.lastSyncAt)}` : 'Connected'}
              <br /><span style={{ opacity: .75 }}>{s.url}</span>
            </span>
          </div>
          <div className="actions">
            <button className="btn" disabled={busy} onClick={async () => { setBusy(true); try { await hub.sync(); } finally { setBusy(false); } }}><RefreshCw /> Sync now</button>
            <button className="btn danger" onClick={() => { if (confirm('Disconnect this phone from sync? Data stays on this phone and on the hub; it just stops syncing.')) void disconnectHub(); }}><Unplug /> Disconnect</button>
          </div>
        </>
      )}
    </section>
  );
}
