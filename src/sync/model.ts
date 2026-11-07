/**
 * Bridges Budge's single in-memory AppState <-> the per-row hub tables.
 *
 * State is split into rows (one per account, transaction, budget, …). After each change we diff the rows against a
 * persisted hash cache and enqueue only what changed (or was deleted). Remote rows are applied to state; the cache is
 * updated first, so applying remote data never echoes back out.
 */
import type { AppState } from '../lib/types';

export const SYNC_TABLES = ['profiles', 'accounts', 'transactions', 'recurring', 'dues', 'budgets', 'holdings', 'planned', 'meta'] as const;
export type SyncTable = (typeof SYNC_TABLES)[number];

export interface Entity { table: SyncTable; id: string; owner: string; value: unknown; }

/** Device-local settings that must not follow you to the other phone. */
const LOCAL_ONLY_SETTINGS = ['theme'] as const;

export function toEntities(s: AppState): Entity[] {
  const out: Entity[] = [];
  for (const p of s.profiles) out.push({ table: 'profiles', id: p.id, owner: p.id, value: p });
  for (const a of s.accounts) out.push({ table: 'accounts', id: a.id, owner: a.profileId, value: a });
  for (const t of s.transactions) out.push({ table: 'transactions', id: t.id, owner: t.profileId, value: t });
  for (const r of s.recurring) out.push({ table: 'recurring', id: r.id, owner: r.profileId, value: r });
  for (const d of s.dues) out.push({ table: 'dues', id: d.id, owner: d.profileId, value: d });
  for (const b of s.budgets) out.push({ table: 'budgets', id: b.id, owner: b.profileId, value: b });
  for (const h of s.holdings) out.push({ table: 'holdings', id: h.id, owner: h.profileId, value: h });
  for (const p of s.planned) out.push({ table: 'planned', id: p.id, owner: p.scope, value: p });
  const { theme: _t, ...sharedSettings } = s.settings; void _t;
  out.push({ table: 'meta', id: 'settings', owner: '', value: sharedSettings });
  out.push({ table: 'meta', id: 'categories', owner: '', value: s.categories });
  out.push({ table: 'meta', id: 'app', owner: '', value: { onboarded: true } });
  return out;
}

/** 53-bit string hash (cyrb53) — change detection only, not security. */
export function hash(str: string): string {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36) + ':' + str.length;
}

export type Cache = Record<string, string>; // "table/id" -> hash
export const keyOf = (table: string, id: string) => `${table}/${id}`;

export interface Diff { puts: Entity[]; removes: { table: SyncTable; id: string; owner: string }[]; next: Cache; }

export function diff(s: AppState, cache: Cache): Diff {
  const next: Cache = {};
  const puts: Entity[] = [];
  const seen = new Set<string>();
  for (const e of toEntities(s)) {
    const k = keyOf(e.table, e.id);
    const h = hash(JSON.stringify(e.value));
    seen.add(k);
    next[k] = h;
    if (cache[k] !== h) puts.push(e);
  }
  const removes: Diff['removes'] = [];
  for (const k of Object.keys(cache)) {
    if (seen.has(k)) continue;
    const [table, ...rest] = k.split('/');
    removes.push({ table: table as SyncTable, id: rest.join('/'), owner: '' });
  }
  return { puts, removes, next };
}

export interface RemoteLike { table: string; id: string; deleted: boolean; value?: unknown; }

/** Apply decrypted remote rows to state. Pure: returns the new state and the cache hashes for what was applied. */
export function applyRemote(s: AppState, rows: RemoteLike[]): { state: AppState; cache: Cache; removed: string[] } {
  const cache: Cache = {};
  const removed: string[] = [];
  let next: AppState = s;
  const list = <K extends 'profiles' | 'accounts' | 'transactions' | 'recurring' | 'dues' | 'budgets' | 'holdings' | 'planned'>(k: K) => next[k] as unknown as { id: string }[];
  const setList = (k: string, v: unknown[]) => { next = { ...next, [k]: v } as AppState; };

  for (const r of rows) {
    const key = keyOf(r.table, r.id);
    if (r.table === 'meta') {
      if (r.deleted || r.value === undefined) continue;
      if (r.id === 'settings') {
        const local = next.settings;
        const merged = { ...local, ...(r.value as object) } as AppState['settings'];
        for (const k of LOCAL_ONLY_SETTINGS) (merged as unknown as Record<string, unknown>)[k] = local[k];
        next = { ...next, settings: merged };
        const { theme: _t, ...shared } = merged; void _t;
        cache[key] = hash(JSON.stringify(shared));
      } else if (r.id === 'categories') {
        next = { ...next, categories: r.value as AppState['categories'] };
        cache[key] = hash(JSON.stringify(r.value));
      } else if (r.id === 'app') {
        next = { ...next, onboarded: true };
        cache[key] = hash(JSON.stringify({ onboarded: true }));
      }
      continue;
    }
    if (!['profiles', 'accounts', 'transactions', 'recurring', 'dues', 'budgets', 'holdings', 'planned'].includes(r.table)) continue;
    const t = r.table as 'profiles';
    const cur = list(t);
    if (r.deleted) {
      removed.push(key);
      if (cur.some((x) => x.id === r.id)) setList(t, cur.filter((x) => x.id !== r.id));
      continue; // not in state => not in next-cache => diff sees no change
    }
    const idx = cur.findIndex((x) => x.id === r.id);
    setList(t, idx >= 0 ? cur.map((x, i) => (i === idx ? (r.value as { id: string }) : x)) : [...cur, r.value as { id: string }]);
    cache[key] = hash(JSON.stringify(r.value));
  }
  return { state: next, cache, removed };
}
