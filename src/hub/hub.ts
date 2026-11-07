/**
 * hub client — offline-first sync for one app against the shared hub Worker.
 *
 * Local IndexedDB stays the source of truth for the app. This module:
 *  - keeps an OUTBOX of local changes (coalesced per row) that survives reloads/offline,
 *  - encrypts rows before upload and decrypts rows on download (see crypto.ts),
 *  - pulls remote changes with a server cursor and hands them to `onRemote`,
 *  - runs automatically: shortly after a change, on app start, when the network returns, when the tab becomes visible,
 *    and every minute while open.
 *
 * Wiring (see budge/src/sync): call `hub.put(table, id, value, {owner})` / `hub.remove(table, id)` when local data
 * changes; apply what `onRemote` delivers to your local store WITHOUT re-enqueueing it.
 */
import { openDB, type IDBPDatabase } from 'idb';
import { decryptJson, deriveKey, encryptJson, PassphraseError } from './crypto';

export { PassphraseError };

export type HubStatus = 'off' | 'idle' | 'syncing' | 'offline' | 'error';
export interface HubState { status: HubStatus; configured: boolean; pending: number; lastSyncAt?: number; error?: string; url?: string; }
export interface RemoteRow<T = unknown> { table: string; id: string; owner: string; updatedAt: number; deleted: boolean; value?: T; }

export interface HubOptions {
  app: string;
  tables: string[];
  /** Called with decrypted remote changes (newer than what this device already has). Must NOT re-enqueue them. */
  onRemote: (rows: RemoteRow[]) => void | Promise<void>;
  /** Override for tests. */
  fetchImpl?: typeof fetch;
  dbName?: string;
  /** Debounce after a local change before syncing (ms). */
  debounceMs?: number;
}

interface OutboxItem { key: string; table: string; id: string; owner: string; updatedAt: number; deleted: boolean; value?: unknown; }
interface Config { url: string; apiKey: string; cryptoKey: CryptoKey; }

export class HubError extends Error {
  constructor(message: string, public status?: number, public code?: string) { super(message); this.name = 'HubError'; }
}

export class Hub {
  private db!: Promise<IDBPDatabase>;
  private cfg: Config | null = null;
  private listeners = new Set<(s: HubState) => void>();
  private st: HubState = { status: 'off', configured: false, pending: 0 };
  private timer: ReturnType<typeof setTimeout> | undefined;
  private running: Promise<void> | null = null;
  private again = false;
  private started = false;
  private f: typeof fetch;

  constructor(private o: HubOptions) {
    this.f = o.fetchImpl ?? ((...a) => fetch(...a));
    this.db = openDB(o.dbName ?? `hub-${o.app}`, 1, {
      upgrade(db) { db.createObjectStore('kv'); db.createObjectStore('outbox', { keyPath: 'key' }); db.createObjectStore('known'); },
    });
  }

  /* ───────── state ───────── */
  get state(): HubState { return this.st; }
  subscribe(fn: (s: HubState) => void): () => void { this.listeners.add(fn); fn(this.st); return () => this.listeners.delete(fn); }
  private set(p: Partial<HubState>) { this.st = { ...this.st, ...p }; this.listeners.forEach((l) => l(this.st)); }
  private async refreshPending() { this.set({ pending: await (await this.db).count('outbox') }); }

  /* ───────── setup ───────── */
  /** Load saved config (call once at startup). */
  async init(): Promise<void> {
    const db = await this.db;
    const saved = (await db.get('kv', 'config')) as Config | undefined;
    const last = (await db.get('kv', 'lastSyncAt')) as number | undefined;
    if (saved) { this.cfg = saved; this.set({ configured: true, status: 'idle', url: saved.url, lastSyncAt: last }); }
    await this.refreshPending();
  }

  /**
   * Connect this device. Verifies the key against the server and the passphrase against any existing data BEFORE saving,
   * so a typo can never cause this device to upload data other devices can't read.
   */
  async configure(input: { url: string; apiKey: string; passphrase: string }): Promise<void> {
    const url = input.url.trim().replace(/\/+$/, '');
    if (!/^https?:\/\//.test(url)) throw new HubError('Enter the hub URL (https://…)');
    const apiKey = input.apiKey.trim();
    const cryptoKey = await deriveKey(this.o.app, input.passphrase);
    const cfg: Config = { url, apiKey, cryptoKey };
    await this.call(cfg, 'GET', `/v1/${this.o.app}`); // key + URL + CORS check
    for (const table of this.o.tables) {
      const page = await this.call<{ rows: ServerRow[] }>(cfg, 'GET', `/v1/${this.o.app}/${table}?since=0&limit=5`);
      const sample = page.rows.find((r) => !r.deleted && r.payload);
      if (sample) { await decryptJson(cryptoKey, aad(this.o.app, table, sample.id), sample.payload); break; } // throws PassphraseError
    }
    const db = await this.db;
    await db.put('kv', cfg, 'config');
    this.cfg = cfg;
    this.set({ configured: true, status: 'idle', url, error: undefined });
    this.schedule(0);
  }

  async disconnect(opts: { forgetCursors?: boolean } = { forgetCursors: true }): Promise<void> {
    const db = await this.db;
    await db.delete('kv', 'config');
    if (opts.forgetCursors) { await db.clear('outbox'); await db.clear('known'); for (const k of await db.getAllKeys('kv')) if (String(k).startsWith('app:')) await db.delete('kv', k); for (const t of this.o.tables) await db.delete('kv', `cursor:${t}`); await db.delete('kv', 'lastSyncAt'); }
    this.cfg = null;
    this.set({ configured: false, status: 'off', pending: 0, error: undefined, url: undefined, lastSyncAt: undefined });
  }

  /** Small per-device key/value store for the app's own sync bookkeeping (cleared on disconnect). */
  async kvGet<T = unknown>(k: string): Promise<T | undefined> { return (await (await this.db).get('kv', `app:${k}`)) as T | undefined; }
  async kvSet(k: string, v: unknown): Promise<void> { await (await this.db).put('kv', v, `app:${k}`); }

  /* ───────── local changes ───────── */
  async put(table: string, id: string, value: unknown, opts: { owner?: string; updatedAt?: number } = {}): Promise<void> {
    await this.enqueue({ table, id, owner: opts.owner ?? '', updatedAt: opts.updatedAt ?? Date.now(), deleted: false, value });
  }
  async remove(table: string, id: string, opts: { owner?: string; updatedAt?: number } = {}): Promise<void> {
    await this.enqueue({ table, id, owner: opts.owner ?? '', updatedAt: opts.updatedAt ?? Date.now(), deleted: true });
  }
  private async enqueue(i: Omit<OutboxItem, 'key'>) {
    if (!this.o.tables.includes(i.table)) throw new HubError(`unknown table ${i.table}`);
    const db = await this.db;
    await db.put('outbox', { ...i, key: `${i.table}/${i.id}` });
    await this.refreshPending();
    if (this.cfg) this.schedule(this.o.debounceMs ?? 2000);
  }

  /* ───────── sync ───────── */
  /** Start automatic syncing (idempotent). */
  start(): void {
    if (this.started || typeof window === 'undefined') return;
    this.started = true;
    window.addEventListener('online', () => this.schedule(0));
    window.addEventListener('offline', () => this.set({ status: this.cfg ? 'offline' : 'off' }));
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') this.schedule(0); });
    setInterval(() => { if (document.visibilityState === 'visible') this.schedule(0); }, 60_000);
    this.schedule(0);
  }

  schedule(ms: number) {
    if (!this.cfg) return;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => { void this.sync(); }, ms);
  }

  /** Push the outbox, then pull remote changes. Safe to call any time; overlapping calls are coalesced. */
  sync(): Promise<void> {
    if (!this.cfg) return Promise.resolve();
    if (this.running) { this.again = true; return this.running; }
    this.running = (async () => {
      try {
        do { this.again = false; await this.cycle(); } while (this.again);
      } finally { this.running = null; }
    })();
    return this.running;
  }

  private async cycle() {
    const cfg = this.cfg!;
    this.set({ status: 'syncing', error: undefined });
    try {
      await this.push(cfg);
      await this.pull(cfg);
      const now = Date.now();
      await (await this.db).put('kv', now, 'lastSyncAt');
      this.set({ status: 'idle', lastSyncAt: now });
    } catch (e) {
      const err = e as HubError;
      const offline = err instanceof TypeError || (typeof navigator !== 'undefined' && navigator.onLine === false);
      this.set({ status: offline ? 'offline' : 'error', error: offline ? undefined : err.message });
    }
    await this.refreshPending();
  }

  private async push(cfg: Config) {
    const db = await this.db;
    for (;;) {
      const batch = ((await db.getAll('outbox')) as OutboxItem[]).slice(0, 50);
      if (!batch.length) return;
      const byTable = new Map<string, OutboxItem[]>();
      for (const i of batch) byTable.set(i.table, [...(byTable.get(i.table) ?? []), i]);
      for (const [table, items] of byTable) {
        const rows = await Promise.all(items.map(async (i) => ({
          id: i.id, owner: i.owner, updated_at: i.updatedAt, deleted: i.deleted,
          payload: i.deleted ? '' : await encryptJson(cfg.cryptoKey, aad(this.o.app, table, i.id), i.value),
        })));
        const res = await this.call<{ results: { id: string; applied: boolean }[] }>(cfg, 'POST', `/v1/${this.o.app}/${table}`, { rows });
        const tx = db.transaction(['outbox', 'known'], 'readwrite');
        for (let n = 0; n < items.length; n++) {
          const it = items[n];
          const cur = (await tx.objectStore('outbox').get(it.key)) as OutboxItem | undefined;
          if (cur && cur.updatedAt === it.updatedAt) await tx.objectStore('outbox').delete(it.key); // not changed again while in flight
          if (res.results[n]?.applied) await tx.objectStore('known').put(it.updatedAt, it.key);
        }
        await tx.done;
      }
    }
  }

  private async pull(cfg: Config) {
    const db = await this.db;
    for (const table of this.o.tables) {
      for (;;) {
        const since = ((await db.get('kv', `cursor:${table}`)) as number | undefined) ?? 0;
        const page = await this.call<{ rows: ServerRow[]; cursor: number; more: boolean }>(cfg, 'GET', `/v1/${this.o.app}/${table}?since=${since}&limit=500`);
        const fresh: RemoteRow[] = [];
        for (const r of page.rows) {
          const key = `${table}/${r.id}`;
          const known = ((await db.get('known', key)) as number | undefined) ?? -1;
          const pending = (await db.get('outbox', key)) as OutboxItem | undefined;
          if (r.updated_at <= known) continue;                       // already have this (or newer)
          if (pending && pending.updatedAt >= r.updated_at) continue; // our unsent change wins
          fresh.push({
            table, id: r.id, owner: r.owner, updatedAt: r.updated_at, deleted: r.deleted,
            value: r.deleted ? undefined : await decryptJson(cfg.cryptoKey, aad(this.o.app, table, r.id), r.payload),
          });
        }
        if (fresh.length) {
          await this.o.onRemote(fresh);
          const tx = db.transaction('known', 'readwrite');
          for (const r of fresh) await tx.store.put(r.updatedAt, `${table}/${r.id}`);
          await tx.done;
        }
        await db.put('kv', page.cursor, `cursor:${table}`);
        if (!page.more) break;
      }
    }
  }

  private async call<T>(cfg: Config, method: string, path: string, body?: unknown): Promise<T> {
    const res = await this.f(cfg.url + path, {
      method, headers: { Authorization: `Bearer ${cfg.apiKey}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      let code = '';
      try { code = ((await res.json()) as { error?: string }).error ?? ''; } catch { /* not json */ }
      const msg = res.status === 401 ? 'The API key was rejected' : res.status === 403 ? 'This site isn’t allowed to use the hub (CORS origin)' : res.status === 429 ? 'Slow down — rate limited' : `Hub error ${res.status}${code ? ` (${code})` : ''}`;
      throw new HubError(msg, res.status, code);
    }
    return (await res.json()) as T;
  }
}

interface ServerRow { id: string; owner: string; updated_at: number; synced_at: number; deleted: boolean; payload: string; }
const aad = (app: string, table: string, id: string) => `${app}/${table}/${id}`;
