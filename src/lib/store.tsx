import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { openDB } from 'idb';
import { todayYMD } from './dates';
import { emptyState } from './demo';
import { balances, inScope, materialize, uid } from './ledger';
import { FAMILY, type AppState, type Transaction, type YMD } from './types';

const DB = 'budge-v2';
const KEY = 'state';
const dbp = typeof indexedDB !== 'undefined' ? openDB(DB, 1, { upgrade(db) { db.createObjectStore('kv'); } }) : null;

async function load(): Promise<AppState> {
  try {
    const s = (await dbp?.then((d) => d.get('kv', KEY))) as AppState | undefined;
    if (s && s.v === 2) return { ...emptyState(), ...s, settings: { ...emptyState().settings, ...s.settings } };
  } catch { /* fall through */ }
  return emptyState();
}
const save = (s: AppState) => dbp?.then((d) => d.put('kv', s, KEY)).catch(() => {});

export interface ToastMsg { id: string; msg: string; action?: { label: string; run: () => void }; }
export interface ModalReq { name: string; props?: Record<string, unknown>; }

interface Ctx {
  state: AppState;
  today: YMD;
  view: string;
  setView: (v: string) => void;
  scope: string[];
  bal: Record<string, number>;
  update: (fn: (s: AppState) => AppState, opts?: { undo?: string; toast?: string }) => void;
  replaceAll: (s: AppState) => void;
  fmt: (n: number, o?: { sign?: boolean }) => string;
  fmt0: (n: number, o?: { sign?: boolean }) => string;
  toasts: ToastMsg[];
  toast: (msg: string, action?: ToastMsg['action']) => void;
  modal: ModalReq | null;
  openModal: (name: string, props?: Record<string, unknown>) => void;
  closeModal: () => void;
  burst: number;
  celebrate: () => void;
  palette: boolean;
  setPalette: (b: boolean) => void;
}

const C = createContext<Ctx | null>(null);
export const useApp = () => { const c = useContext(C); if (!c) throw new Error('no provider'); return c; };

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState | null>(null);
  const [today, setToday] = useState<YMD>(todayYMD());
  const [view, setViewRaw] = useState<string>(() => localStorage.getItem('budge.view') || FAMILY);
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const [modal, setModal] = useState<ModalReq | null>(null);
  const [burst, setBurst] = useState(0);
  const [palette, setPalette] = useState(false);
  const loaded = useRef(false);
  const stateRef = useRef<AppState | null>(null);
  const set = useCallback((s: AppState) => { stateRef.current = s; setState(s); }, []);

  useEffect(() => { load().then((s) => { set(s); loaded.current = true; }); navigator.storage?.persist?.().catch(() => {}); }, [set]);

  // keep "today" fresh while the app stays open / returns from background
  useEffect(() => {
    const tick = () => setToday((t) => { const n = todayYMD(); return n === t ? t : n; });
    const id = setInterval(tick, 60_000);
    document.addEventListener('visibilitychange', tick);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', tick); };
  }, []);

  // debounced persistence
  const latest = useRef<AppState | null>(null);
  useEffect(() => {
    if (!state || !loaded.current) return;
    latest.current = state;
    const t = setTimeout(() => save(state), 250);
    return () => clearTimeout(t);
  }, [state]);
  useEffect(() => {
    const flush = () => { if (latest.current) save(latest.current); };
    const vis = () => document.visibilityState === 'hidden' && flush();
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', vis);
    return () => { window.removeEventListener('pagehide', flush); document.removeEventListener('visibilitychange', vis); };
  }, []);

  const toast = useCallback((msg: string, action?: ToastMsg['action']) => {
    const id = uid();
    setToasts((t) => [...t.slice(-2), { id, msg, action }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), action ? 6500 : 3200);
  }, []);

  // Post anything that's come due (paychecks, subscriptions, card payments).
  useEffect(() => {
    if (!state?.onboarded) return;
    const r = materialize(state, today);
    if (r.created.length) {
      set(r.state);
      const inc = r.created.filter((t) => t.type === 'income');
      toast(
        inc.length ? `Payday! ${inc.length} paycheck${inc.length > 1 ? 's' : ''} landed · ${r.created.length - inc.length} other item${r.created.length - inc.length === 1 ? '' : 's'} posted` : `${r.created.length} scheduled item${r.created.length > 1 ? 's' : ''} posted`,
      );
      if (inc.length) setBurst((b) => b + 1);
    }
  }, [state, today, toast, set]);

  const update: Ctx['update'] = useCallback((fn, opts) => {
    const prev = stateRef.current;
    if (!prev) return;
    set(fn(prev));
    if (opts?.undo) toast(opts.undo, { label: 'Undo', run: () => set(prev) });
    else if (opts?.toast) toast(opts.toast);
  }, [toast, set]);

  const setView = useCallback((v: string) => { setViewRaw(v); localStorage.setItem('budge.view', v); }, []);

  const money = useMemo(() => {
    const cur = state?.settings.currency ?? 'USD';
    const mk = (d: number) => new Intl.NumberFormat(undefined, { style: 'currency', currency: cur, minimumFractionDigits: d, maximumFractionDigits: d });
    const f2 = mk(2), f0 = mk(0);
    const wrap = (f: Intl.NumberFormat) => (n: number, o?: { sign?: boolean }) => {
      const s = f.format(Math.abs(n) < 0.005 ? 0 : n);
      return o?.sign && n > 0 ? `+${s}` : s;
    };
    return { fmt: wrap(f2), fmt0: wrap(f0) };
  }, [state?.settings.currency]);

  // theme
  useEffect(() => {
    const t = state?.settings.theme ?? 'auto';
    if (t === 'auto') delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = t;
  }, [state?.settings.theme]);

  const value = useMemo<Ctx | null>(() => {
    if (!state) return null;
    const ids = state.profiles.map((p) => p.id);
    const scope = view === FAMILY || !ids.includes(view) ? ids : [view];
    return {
      state, today, view: scope.length === ids.length && ids.length > 1 ? FAMILY : scope[0] ?? FAMILY, setView, scope,
      bal: balances(state, today), update, replaceAll: set, ...money, toasts, toast,
      modal, openModal: (name, props) => setModal({ name, props }), closeModal: () => setModal(null),
      burst, celebrate: () => setBurst((b) => b + 1), palette, setPalette,
    };
  }, [state, today, view, setView, update, set, money, toasts, toast, modal, burst, palette]);

  if (!value) return <div className="splash"><div className="splash-mark" /></div>;
  return <C.Provider value={value}>{children}</C.Provider>;
}

/* ───────── state helpers used by forms/pages ───────── */
export function deleteTransaction(s: AppState, id: string): AppState {
  const t = s.transactions.find((x) => x.id === id);
  if (!t) return s;
  return {
    ...s,
    transactions: s.transactions.filter((x) => x.id !== id),
    dues: t.dueId ? s.dues.map((d) => (d.id === t.dueId ? { ...d, status: 'skipped', txId: undefined } : d)) : s.dues,
  };
}

export function deleteAccount(s: AppState, id: string): AppState {
  const txIds = new Set(s.transactions.filter((t) => t.accountId === id || t.toAccountId === id).map((t) => t.id));
  return {
    ...s,
    accounts: s.accounts.filter((a) => a.id !== id),
    transactions: s.transactions.filter((t) => !txIds.has(t.id)),
    recurring: s.recurring.filter((r) => r.accountId !== id),
    dues: s.dues.filter((d) => d.accountId !== id && d.payFromId !== id),
  };
}

export function profileName(s: AppState, id: string) { return s.profiles.find((p) => p.id === id)?.name ?? '—'; }
export function accountsFor(s: AppState, scope: string[], opts: { kinds?: string[]; profileId?: string } = {}) {
  return inScope(s.accounts, opts.profileId ? [opts.profileId] : scope).filter((a) => !a.archived && (!opts.kinds || opts.kinds.includes(a.kind)));
}
export type { Transaction };
