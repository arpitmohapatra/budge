import { describe, expect, it } from 'vitest';
import { demoState } from '../lib/demo';
import { materialize } from '../lib/ledger';
import { applyRemote, diff, toEntities, type Cache } from './model';

const TODAY = '2026-11-07';
const base = () => demoState(TODAY, ['A', 'B']);

describe('sync model', () => {
  it('first diff uploads everything once; an unchanged state diffs to nothing', () => {
    const s = base();
    const d1 = diff(s, {});
    expect(d1.puts.length).toBe(toEntities(s).length);
    expect(d1.removes).toHaveLength(0);
    const d2 = diff(s, d1.next);
    expect(d2.puts).toHaveLength(0);
    expect(d2.removes).toHaveLength(0);
  });

  it('detects edits and deletes at row granularity', () => {
    const s = base();
    const cache = diff(s, {}).next;
    const edited = { ...s, accounts: s.accounts.map((a) => (a.id === 'a1' ? { ...a, name: 'Renamed' } : a)), transactions: s.transactions.slice(1) };
    const d = diff(edited, cache);
    expect(d.puts.map((p) => `${p.table}/${p.id}`)).toEqual(['accounts/a1']);
    expect(d.puts[0].owner).toBe('p1');
    expect(d.removes).toEqual([{ table: 'transactions', id: s.transactions[0].id, owner: '' }]);
  });

  it('theme is device-local: changing it syncs nothing', () => {
    const s = base();
    const cache = diff(s, {}).next;
    const d = diff({ ...s, settings: { ...s.settings, theme: 'dark' } }, cache);
    expect(d.puts).toHaveLength(0);
  });

  it('remote rows apply to state without echoing back out', () => {
    const s = base();
    const cache: Cache = diff(s, {}).next;
    const remoteAcct = { ...s.accounts[0], name: 'Edited on the other phone' };
    const newTx = { ...s.transactions[0], id: 'tx-remote', note: 'from phone B' };
    const r = applyRemote(s, [
      { table: 'accounts', id: remoteAcct.id, deleted: false, value: remoteAcct },
      { table: 'transactions', id: 'tx-remote', deleted: false, value: newTx },
      { table: 'transactions', id: s.transactions[1].id, deleted: true },
    ]);
    expect(r.state.accounts[0].name).toBe('Edited on the other phone');
    expect(r.state.transactions.find((t) => t.id === 'tx-remote')?.note).toBe('from phone B');
    expect(r.state.transactions.some((t) => t.id === s.transactions[1].id)).toBe(false);
    const merged: Cache = { ...cache, ...r.cache };
    for (const k of r.removed) delete merged[k];
    const echo = diff(r.state, merged);
    expect(echo.puts).toHaveLength(0);
    expect(echo.removes).toHaveLength(0);
  });

  it('settings sync but keep this phone’s own theme; the app row marks the phone as onboarded', () => {
    const s = { ...base(), onboarded: false, settings: { ...base().settings, theme: 'dark' as const } };
    const r = applyRemote(s, [
      { table: 'meta', id: 'settings', deleted: false, value: { ...base().settings, buffer: 900, theme: 'light' } },
      { table: 'meta', id: 'app', deleted: false, value: { onboarded: true } },
    ]);
    expect(r.state.settings.buffer).toBe(900);
    expect(r.state.settings.theme).toBe('dark');
    expect(r.state.onboarded).toBe(true);
  });

  it('two phones auto-posting the same paycheck/bill produce the SAME transaction ids (so sync merges, not doubles)', () => {
    const s = base();
    const behind = { ...s, recurring: s.recurring.map((r) => ({ ...r, postedThrough: '2026-11-01' })) };
    const a = materialize(behind, '2026-11-07').created.map((t) => t.id).sort();
    const b = materialize(behind, '2026-11-07').created.map((t) => t.id).sort();
    expect(a.length).toBeGreaterThan(0);
    expect(a).toEqual(b);
    expect(a.every((id) => id.startsWith('rec:') || id.startsWith('due:'))).toBe(true);
  });
});
