import { useEffect, useRef, useState } from 'react';
import { useApp } from '../lib/store';
import { applyRemote, diff, type Cache } from './model';
import { ctl, hub, setRemoteHandler, useHubState } from './hub';

/** Invisible component: keeps Budge's state and the hub in step. Render once inside <AppProvider>. */
export function SyncBridge() {
  const { state, update } = useApp();
  const hs = useHubState();
  const stateRef = useRef(state);
  stateRef.current = state;
  const cache = useRef<Cache>({});
  const [ready, setReady] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();

  const persist = () => { clearTimeout(saveTimer.current); saveTimer.current = setTimeout(() => void hub.kvSet('cache', cache.current), 300); };

  // remote -> state
  useEffect(() => {
    setRemoteHandler((rows) => {
      update((s) => {
        const r = applyRemote(s, rows);
        Object.assign(cache.current, r.cache);
        for (const k of r.removed) delete cache.current[k];
        return r.state;
      });
      persist();
    });
    return () => setRemoteHandler(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [update]);

  // startup + enable/disable controls
  useEffect(() => {
    ctl.enable = () => setReady(true);
    ctl.disable = () => { setReady(false); cache.current = {}; };
    (async () => {
      await hub.init();
      if (hub.state.configured) {
        const saved = await hub.kvGet<Cache>('cache');
        if (saved) { cache.current = saved; setReady(true); }
        else { await hub.sync(); setReady(true); } // configured but never finished the first pull
      }
      hub.start();
    })();
  }, []);

  // state -> outbox (debounced diff; nothing is uploaded until this phone has finished its first pull)
  const flush = () => {
    if (!ready || !hub.state.configured || !stateRef.current.onboarded) return;
    const d = diff(stateRef.current, cache.current);
    if (!d.puts.length && !d.removes.length) return;
    for (const e of d.puts) void hub.put(e.table, e.id, e.value, { owner: e.owner });
    for (const r of d.removes) void hub.remove(r.table, r.id);
    cache.current = d.next;
    persist();
  };
  useEffect(() => {
    if (!ready || !hs.configured) return;
    const t = setTimeout(flush, 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, ready, hs.configured]);
  useEffect(() => {
    const onHide = () => { if (document.visibilityState === 'hidden') flush(); };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', flush);
    return () => { document.removeEventListener('visibilitychange', onHide); window.removeEventListener('pagehide', flush); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  return null;
}
