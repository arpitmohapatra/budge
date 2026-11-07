import { emptyState } from './demo';
import type { AppState } from './types';

export function download(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export const exportAll = (s: AppState) => ({ kind: 'budge-backup', version: 2, exportedAt: new Date().toISOString(), data: s });

/** One person's slice — lets a spouse on another phone send you just their numbers. */
export function exportProfile(s: AppState, profileId: string) {
  const mine = <T extends { profileId: string }>(a: T[]) => a.filter((x) => x.profileId === profileId);
  const profile = s.profiles.find((p) => p.id === profileId)!;
  return {
    kind: 'budge-profile', version: 2, exportedAt: new Date().toISOString(), profile,
    accounts: mine(s.accounts), transactions: mine(s.transactions), recurring: mine(s.recurring), dues: mine(s.dues),
    budgets: mine(s.budgets), holdings: mine(s.holdings), planned: s.planned.filter((p) => p.scope === profileId),
  };
}

type ProfileFile = ReturnType<typeof exportProfile>;

/** Replaces that person's data with the file's (everyone else untouched). */
export function importProfile(s: AppState, f: ProfileFile): AppState {
  const id = f.profile.id;
  const other = <T extends { profileId: string }>(a: T[]) => a.filter((x) => x.profileId !== id);
  const exists = s.profiles.some((p) => p.id === id);
  return {
    ...s, onboarded: true,
    profiles: exists ? s.profiles.map((p) => (p.id === id ? { ...p, name: f.profile.name, color: f.profile.color } : p)) : [...s.profiles, f.profile],
    accounts: [...other(s.accounts), ...f.accounts], transactions: [...other(s.transactions), ...f.transactions],
    recurring: [...other(s.recurring), ...f.recurring], dues: [...other(s.dues), ...f.dues], budgets: [...other(s.budgets), ...f.budgets],
    holdings: [...other(s.holdings), ...f.holdings], planned: [...s.planned.filter((p) => p.scope !== id), ...f.planned],
  };
}

export function parseBackup(text: string): { type: 'all'; state: AppState } | { type: 'profile'; file: ProfileFile } {
  const j = JSON.parse(text);
  if (j?.kind === 'budge-backup' && j.data?.v === 2) return { type: 'all', state: { ...emptyState(), ...j.data, settings: { ...emptyState().settings, ...j.data.settings } } };
  if (j?.kind === 'budge-profile' && j.profile?.id) return { type: 'profile', file: j };
  throw new Error('That file is not a Budge backup.');
}
